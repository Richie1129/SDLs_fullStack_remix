//controllers for project - Member Management
const Project = require('../../models/project')
const User = require('../../models/user')
const User_project = require('../../models/user_project');
const sequelize = require('../../util/database');

exports.inviteForProject = async (req, res) => {
    const referral_Code = req.body.referral_Code;
    const userId = req.body.userId;

    console.log('Referral Code:', referral_Code);
    console.log('User ID:', userId);

    if (!referral_Code) {
        console.log('Referral code is missing!');
        return res.status(400).json({ message: '請輸入邀請碼!' });
    }

    try {
        // 查找具有給定邀請碼的項目
        const referralProject = await Project.findOne({
            where: {
                referral_code: referral_Code
            }
        });

        // 檢查是否找到了項目
        if (!referralProject) {
            console.log('Project not found for referral code:', referral_Code);
            return res.status(404).json({ message: '邀請碼不存在!' });
        }
        console.log("projectId:", referralProject.id); // 新增日誌輸出
        console.log("userId:", userId); // 新增日誌輸出
        // 檢查使用者是否已經存在於專案中
        const userProject = await User_project.findOne({
            where: {
                projectId: referralProject.id,
                userId: userId
            }

        });
        console.log("userProject:", userProject); // 新增日誌輸出

        if (userProject) {
            console.log('User already exists in project!');
            return res.status(400).json({ message: '你已經是此活動的其中一員!' });
        }

        // 找到用户
        const invitedUser = await User.findByPk(userId);
        if (!invitedUser) {
            console.log('User not found:', userId);
            return res.status(404).json({ message: 'User not found!' });
        }

        // 將用戶加入項目
        await referralProject.addUser(invitedUser);

        console.log('Successfully invited user to project!');
        // 成功邀請用戶加入項目
        return res.status(200).json({ message: '成功加入活動!' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error!' });
    }
};

exports.assignStudentsToGroup = async (req, res) => {
    const { studentIds, projectId } = req.body;

    try {
        const project = await Project.findByPk(projectId);
        if (!project) {
            return res.status(404).json({ message: '專案未找到' });
        }

        const students = await User.findAll({
            where: {
                id: studentIds,
                role: 'student'
            }
        });

        if (students.length !== studentIds.length) {
            return res.status(400).json({ message: '部分學生ID無效或學生不存在' });
        }

        // 將學生加入專案（使用交易以確保全部或全部不成功）
        const t = await sequelize.transaction();
        try {
            await project.addUsers(students, { transaction: t });
            await t.commit();
        } catch (txErr) {
            await t.rollback();
            throw txErr;
        }

        return res.status(200).json({ message: '學生成功分配到專案' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: '內部伺服器錯誤' });
    }
};

exports.getAllStudents = async (req, res) => {
    try {
        const students = await User.findAll({
            where: {
                role: 'student'
            }
        });
        res.status(200).json(students);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '內部伺服器錯誤' });
    }
};

// exports.inviteForProject = async( req, res) => {
//     const referral_Code = req.body.referral_Code;
//     const userId = req.body.userId;
//     console.log(userId);
//     if(!referral_Code){
//         return res.status(404).send({message: 'please enter referral code!'})
//     }
//     const referralProject = await Project.findOne({
//         where:{
//             referral_code:referral_Code
//         }
//     })
//     const invited = await User.findByPk(userId);
//     const userProjectAssociations = await referralProject.addUser(invited)
//     .then(() => {
//             return res.status(200).send({message: 'invite success!'})
//     })
//     .catch(err => {
//         console.log(err);
//         return res.status(500).send({message: 'invite failed!'})
//     });
//
// }
