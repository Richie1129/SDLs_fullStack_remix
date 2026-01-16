import React, { useState, useContext } from 'react';
import { TypeAnimation } from 'react-type-animation';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../utils/AuthContext';
import { useMutation } from 'react-query';
import { userLogin } from '../../api/users';
import Login_icon from "../../assets/Animation-login.json";
import Lottie from "lottie-react";
import Swal from 'sweetalert2';
import storageService, { authStorage, userStorage } from '../../services/storageService';

export default function Login() {
  const [userContext, setUserContext] = useContext(AuthContext);
  const [userData, setUserData] = useState({});
  const navigate = useNavigate();

  const handleChange = (e) =>{
      const { name, value } = e.target
      setUserData( prevData => ({
          ...prevData,
          [name]:value
      }));
  }
  
  const userLoginMutation = useMutation(userLogin, {
      onError: (err) => {
        let errorMessage = '帳號或密碼錯誤';

        if (err.response) {
          switch (err.response.status) {
            case 400:
              errorMessage = err.response.data.message || '請輸入帳號和密碼';
              break;
            case 401:
              errorMessage = err.response.data.message || '帳號或密碼錯誤';
              break;
            case 500:
              errorMessage = '伺服器錯誤，請稍後再試';
              break;
          }
        }

        Swal.fire({
          icon: 'error',
          title: '登入失敗',
          text: errorMessage,
          confirmButtonText: '確定',
          confirmButtonColor: '#5BA491'
        });
      },
      onSuccess: (res) => {
        console.log(res);
        
        // 使用 StorageService 統一管理
        authStorage.set('accessToken', res.data.accessToken);
        authStorage.set('refreshToken', res.data.refreshToken);
        
        userStorage.setMultiple({
          id: res.data.id,
          account: res.data.account,
          email: res.data.email,
          username: res.data.username,
          role: res.data.role
        });
        
        // 可選資料
        if (res.data.class) {
          userStorage.set('class', res.data.class);
        }
        if (res.data.seatNumber) {
          userStorage.set('seatNumber', res.data.seatNumber);
        }

        setUserContext( prev =>{
          return{ ...prev,
              account : res.data.account,
              email : res.data.email,
              id : res.data.id,
              accessToken : res.data.accessToken,
              username : res.data.username,
              role : res.data.role,
              class : res.data.class,
              seatNumber : res.data.seatNumber,
          }
        })

        Swal.fire({
          icon: 'success',
          title: '登入成功',
          text: `歡迎回來，${res.data.username}！`,
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          navigate("/homepage")
        });
      }
  })

  const handleSubmit = (e) =>{
    e.preventDefault()
    userLoginMutation.mutate(userData)
  } 

  return (
    <section className="flex flex-col md:flex-row h-screen items-center">
      <div className="hidden bg-white w-full md:w-1/2 xl:w-1/2 h-screen md:flex md:items-center md:justify-center">
        <div className='flex flex-col items-center justify-center h-full'>
          {/* <h1 className='mx-auto  text-7xl mb-2'>自主學習</h1> */}
          <TypeAnimation
                  sequence={[
                    "自主學習 Self-directed Learning",
                    3000,
                    "學習歷程 Learning Portfolio",
                    3000,
                  ]}
                  speed={50}
                  wrapper="span"
                  cursor={true}
                  repeat={Infinity}
                  className="mx-auto font-press-start font-semibold text-h2 md:text-h1 lg:text-display mb-10 md:mb-20 text-center px-4"
                />
          <Lottie className="w-64 md:w-80 lg:w-96 max-w-full h-auto" animationData={Login_icon} />
        </div>
      </div>
      <div className="bg-white w-full md:max-w-md lg:max-w-full md:mx-auto md:w-1/2 xl:w-1/2 h-screen lg:px-36 xl:px-40 flex items-center justify-center">
        <div className="bg-white w-full h-100 rounded-lg p-component-lg shadow-2xl">
          <h1 className="text-body-lg font-bold mb-6 flex items-center justify-center">歡迎來到 <span style= { {color:"#5BA491" } } className="ml-2"> SDLS</span></h1>
          <h1 className="text-display font-bold mb-6 flex items-center justify-center">登入</h1>
            {/* <button type="button" className="w-full block bg-white hover:bg-gray-100 focus:bg-gray-100 text-gray-900 font-semibold rounded-lg px-4 py-3 border-2 border-customgreen">
              <div className="flex items-center justify-center">
                  <span className="ml-4 ">Login with Wulab</span>
              </div>
            </button>
          <hr className="my-6 border-gray-300 w-full" /> */}
          <form className="mt-6">
            <div>
              <label className="block text-gray-700 text-body">帳號</label>
              <input type="text" name="account" placeholder="請輸入帳號" onChange={handleChange} className=" text-body w-full px-4 py-3 rounded-lg bg-white mt-2 border focus:border-green-700 focus:bg-white focus:outline-none" autoFocus required />
            </div>
            <div className="mt-4">
              <label className="block text-gray-700 text-body">密碼</label>
              <input type="password" name="password" placeholder="請輸入密碼" minLength="6" onChange={handleChange} className=" text-body w-full px-4 py-3 rounded-lg bg-white mt-2 border focus:border-green-700 focus:bg-white focus:outline-none" required />
            </div>
            {/* <p className='text-gray-400 bg-white flex items-center justify-center'><hr className="my-6 border-gray-300 w-1/2" />or<hr className="my-6 border-gray-300 w-1/2" /></p>
            <button className=''><button className=''><button className=''>Google</button>FB</button>Apple</button> */}

            <button type="submit" onClick={handleSubmit} style= { {backgroundColor:"#5BA491" } } className="w-full block  text-white font-semibold rounded-lg px-4 py-3 mt-6 text-body">登入</button>
          </form>
          <div className="mt-8 flex flex-row justify-between items-center">
            <p className="text-gray-400">
              還沒有帳號?
              <span style= { {color:"#5BA491" } } className="text-blue-500 hover:text-blue-700 font-semibold ml-2">
                <Link to="/register">註冊帳號</Link>
              </span>
            </p>
            <p className="text-gray-400">
              忘記密碼?
              <span style= { {color:"#5BA491" } } className="text-blue-500 hover:text-blue-700 font-semibold ml-2">
                <Link to="/forgot-password">重設密碼</Link>
              </span>
            </p>
          </div>
        </div>
      </div>
  </section>
  )
}
