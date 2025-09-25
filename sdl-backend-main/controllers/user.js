const User = require('../models/user');
const Project = require('../models/project');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const {sign} = require('jsonwebtoken');
const sequelize = require('../util/database'); // 引入 Sequelize 實例以支援事務

//get all users
exports.getUsers = (req, res) =>{
    User.findAll()
        .then(users =>{
            res.status(200).json({ user: users})
        })
        .catch(err => console.log(err));
}

//get all teachers
exports.getTeachers = (req, res) => {
    User.findAll({
        where: {
            role: 'teacher' // 確保你的 User 模型中有一個名為 'role' 的欄位
        }
    })
    .then(users => {
        res.status(200).json({ user: users });
    })
    .catch(err => {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    });
}


//get user by id
exports.getUser = (req, res) =>{
    const userId = req.params.userId;
    User.findByPk(userId)
        .then(user =>{
            if(!user){
                return res.status(404).json({ message: 'User not found' });
            }
            res.status(200).json({ user:user });
        })
        .catch(err => console.log(err));
}

//get current user from token
exports.getCurrentUser = async (req, res) => {
    try {
        const userId = req.userId; // 來自 AuthMiddleware
        
        const user = await User.findByPk(userId, {
            attributes: ['id', 'username', 'account', 'email', 'role', 'class', 'seatNumber'] // 排除密碼
        });
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching current user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

// login user
exports.loginUser = (req, res) => {
    const account = req.body.account;
    const password = req.body.password;
        User.findAll({
            where:{
                account: account
            }
        })
        .then(result => {
            if(result){
                bcrypt.compare(password, result[0].password, (err, response) =>{
                    console.log(response);
                    if(response){
                        const account = result[0].account;
                        const email = result[0].email;
                        const username = result[0].username;
                        const id = result[0].id;
                        const classField = result[0].class;
                        const seatNumber = result[0].seatNumber;
                        const accessToken = sign(
                                {account: account, id:id}, 
                                "importantsecret"
                        );
                        const role =  result[0].role;
                        res.json({accessToken, account, email, username, id, role, class: classField, seatNumber});
                    }else{
                        res.status(404).json({message: 'Wrong account or Password!'});
                        console.log(err);
                    }
                });
            };
        })
        .catch(err => {
            console.log(err);
            res.status(500).send({message: 'Wrong account or Password!'})
        });
}

// register user
exports.registerUser = (req, res) => {
    const username = req.body.username;
    const account = req.body.account;
    const email = req.body.email;
    const password = req.body.password;
    const role = req.body.role;
    const classField = req.body.class;
    const seatNumber = req.body.seatNumber;
    console.log("Received username:", username);
    console.log("Received account:", account);
    console.log("Received email:", email);
    console.log("Received password:", password);
    console.log("Received role:", role);
    console.log("Received class:", classField);
    console.log("Received seatNumber:", seatNumber);

    // 檢查用戶是否已經存在
    User.findOne({
        where: {
            account: account
        }
    })
    .then(existingUser => {
        if (existingUser) {
            // 如果用戶已經存在，返回錯誤信息
            return res.status(400).json({ message: '該用戶已存在，請嘗試其他用戶名稱。' });
        } else {
            // 如果用戶不存在，則創建新用戶
            bcrypt.hash(password, saltRounds, (err, hash) => {
                if (err) {
                    console.log(err);
                    res.status(500).json({ message: '內部錯誤，無法創建新用戶。' });
                } else {
                    User.create({
                        username: username,
                        account: account,
                        email: email,
                        password: hash,
                        role: role,
                        class: classField,
                        seatNumber: seatNumber
                    })
                    .then(result => {
                        const account = result.account;
                        const id = result.id;
                        const accessToken = sign(
                            { account: account, id: id },
                            "importantsecret"
                        );
                        console.log(result);
                        res.status(201).json({ accessToken, account, id });
                    })
                    .catch(err => {
                        console.log(err);
                        res.status(500).json({ message: '內部錯誤，無法創建新用戶。' });
                    });
                }
            });
        }
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({ message: '內部錯誤，無法查詢用戶信息。' });
    });
}

//update user profile (excluding password)
exports.updateUserProfile = async (req, res) => {
    try {
        const userId = req.userId; // 來自 AuthMiddleware
        const { username, email, class: classField, seatNumber } = req.body;

        // 驗證輸入
        if (!username || username.trim() === '') {
            return res.status(400).json({ message: '姓名不能為空' });
        }

        // 獲取用戶的舊 username
        const currentUser = await User.findByPk(userId, {
            attributes: ['username']
        });

        if (!currentUser) {
            return res.status(404).json({ message: '用戶未找到' });
        }

        const oldUsername = currentUser.username;
        const newUsername = username.trim();

        // 更新用戶資料
        const [updatedRowsCount] = await User.update({
            username: newUsername,
            email: email || '',
            class: classField || '',
            seatNumber: seatNumber || ''
        }, {
            where: { id: userId }
        });

        if (updatedRowsCount === 0) {
            return res.status(400).json({ message: '用戶資料更新失敗' });
        }

        // 如果 username 有變更，使用事務同步更新所有該用戶建立的卡片和節點的 owner 欄位
        if (oldUsername !== newUsername) {
            const transaction = await sequelize.transaction();
            try {
                // 更新卡片 owner
                const Task = require('../models/task');
                const taskUpdateResult = await Task.update({
                    owner: newUsername
                }, {
                    where: { owner: oldUsername },
                    transaction
                });

                // 更新節點 owner
                const Node = require('../models/node');
                const nodeUpdateResult = await Node.update({
                    owner: newUsername
                }, {
                    where: { owner: oldUsername },
                    transaction
                });

                await transaction.commit();
                console.log(`已將用戶 ${oldUsername} 的所有資料更新為 ${newUsername}:`);
                console.log(`- 卡片: ${taskUpdateResult[0]} 筆`);
                console.log(`- 節點: ${nodeUpdateResult[0]} 筆`);
            } catch (error) {
                await transaction.rollback();
                console.error('更新相關資料失敗，已回滾事務:', error);
                throw new Error('用戶名稱更新失敗：無法同步更新相關資料');
            }
        }

        // 返回更新後的用戶資料
        const updatedUser = await User.findByPk(userId, {
            attributes: ['id', 'username', 'account', 'email', 'role', 'class', 'seatNumber']
        });

        res.status(200).json({
            message: '個人資料更新成功',
            user: updatedUser
        });

    } catch (error) {
        console.error('更新用戶資料失敗:', error);
        res.status(500).json({ message: '伺服器內部錯誤' });
    }
};

//update user password
exports.updateUserPassword = async (req, res) => {
    try {
        const userId = req.userId; // 來自 AuthMiddleware
        const { currentPassword, newPassword } = req.body;

        // 驗證輸入
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: '當前密碼和新密碼都是必需的' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: '新密碼長度不能少於6個字符' });
        }

        // 查找用戶
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: '用戶未找到' });
        }

        // 驗證當前密碼
        const isCurrentPasswordValid = await new Promise((resolve, reject) => {
            bcrypt.compare(currentPassword, user.password, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

        if (!isCurrentPasswordValid) {
            return res.status(400).json({ message: '當前密碼不正確' });
        }

        // 加密新密碼
        const hashedNewPassword = await new Promise((resolve, reject) => {
            bcrypt.hash(newPassword, saltRounds, (err, hash) => {
                if (err) reject(err);
                else resolve(hash);
            });
        });

        // 更新密碼
        const [updatedRowsCount] = await User.update({
            password: hashedNewPassword
        }, {
            where: { id: userId }
        });

        if (updatedRowsCount === 0) {
            return res.status(404).json({ message: '密碼更新失敗' });
        }

        res.status(200).json({ message: '密碼更新成功' });

    } catch (error) {
        console.error('更新密碼失敗:', error);
        res.status(500).json({ message: '伺服器內部錯誤' });
    }
};

//update user
// exports.updateUser = (req, res) => {
//     const userId = req.body.userId;
//     const updatedaccount = req.body.account;
//     const updatedpassword = req.body.password;
//     bcrypt.hash(updatedpassword, saltRounds, (err, hash) => {
//         if(err){
//             console.log(err)
//         };
//         User.findByPk(userId)
//         .then(user => {
//         if (!user) {
//             return res.status(404).json({ message: 'User not found!' });
//         }
//         user.account = updatedaccount;
//         user.password = hash;
//         return user.save();
//         })
//         .then(result => {
//         res.status(200).json({message: 'User updated!'});
//         })
//         .catch(err => console.log(err));
//     })
// }

exports.getProjectUsers = async(req, res) => {
    const projectId = req.params.projectId;
    await User.findAll({
        attributes: ['id', 'username', 'class', 'seatNumber'],
        include: [{
            model:Project,
            attributes:[],
            where :{
            id:projectId
        },
        }]
    })
    .then(result =>{
        console.log(result);
        res.status(200).json(result)
    })
    .catch(err => console.log(err));
}

// delete user
// exports.deleteUser = (req, res) => {
//     const userId = req.body.userId;
//     User.findByPk(userId)
//         .then(user => {
//             if (!user) {
//                 return res.status(404).json({ message: 'User not found!' });
//             }
//             return User.destroy({
//                 where: {
//                 id: userId
//                 }
//             });
//         })
//         .then(result => {
//             res.status(200).json({ message: 'User deleted!' });
//         })
//         .catch(err => console.log(err));
// }
