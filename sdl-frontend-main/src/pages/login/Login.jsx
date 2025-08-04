import React, { useState, useContext } from 'react';
import { TypeAnimation } from 'react-type-animation';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../utils/AuthContext';
import { useMutation } from 'react-query';
import { userLogin } from '../../api/users';
import Login_icon from "../../assets/Animation-login.json";
import Lottie from "lottie-react";

export default function Login() {
  const [userContext, setUserContext] = useContext(AuthContext);
  const [userData, setUserData] = useState({});
  const [ error, setError ] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) =>{
      const { name, value } = e.target
      setUserData( prevData => ({
          ...prevData,
          [name]:value
      }));
  }
  
  const userLoginMutation = useMutation(userLogin, {
      onSuccess: (res) => {
        console.log(res);
        localStorage.setItem("accessToken", res.data.accessToken);
        localStorage.setItem("account", res.data.account);
        localStorage.setItem("id", res.data.id);
        localStorage.setItem("username", res.data.username);
        localStorage.setItem("role", res.data.role);
        if (res.data.class) {
          localStorage.setItem("class", res.data.class);
        }
        if (res.data.seatNumber) {
          localStorage.setItem("seatNumber", res.data.seatNumber);
        }

        setUserContext( prev =>{
          return{ ...prev, 
              account : res.data.account,
              id : res.data.id,
              accessToken : res.data.accessToken,
              username : res.data.username,
              role : res.data.role,
              class : res.data.class,
              seatNumber : res.data.seatNumber,
          }
        })
        navigate("/homepage")
        // navigate(`/project/1/kanban`)
      },
      onError: (err) => {
        console.log(err);
        setError("帳號或密碼錯誤")
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
                  className="mx-auto font-press-start font-semibold text-2xl md:text-3xl lg:text-4xl mb-10 md:mb-20 text-center px-4"
                />
          <Lottie className="w-64 md:w-80 lg:w-96 max-w-full h-auto" animationData={Login_icon} />
        </div>
      </div>
      <div className="bg-white w-full md:max-w-md lg:max-w-full md:mx-auto md:w-1/2 xl:w-1/2 h-screen lg:px-36 xl:px-40 flex items-center justify-center">
        <div className="bg-white w-full h-100 rounded-lg p-8 shadow-2xl">
          <h1 className="text-lg font-bold mb-6 flex items-center justify-center">歡迎來到 <span style= { {color:"#5BA491" } } className="ml-2"> SDLS</span></h1>
          <h1 className="text-4xl font-bold mb-6 flex items-center justify-center">登入</h1>
            {/* <button type="button" className="w-full block bg-white hover:bg-gray-100 focus:bg-gray-100 text-gray-900 font-semibold rounded-lg px-4 py-3 border-2 border-customgreen">
              <div className="flex items-center justify-center">
                  <span className="ml-4 ">Login with Wulab</span>
              </div>
            </button>
          <hr className="my-6 border-gray-300 w-full" /> */}
          <form className="mt-6">
            <div>
              <label className="block text-gray-700 text-base">帳號</label>
              <input type="text" name="account" placeholder="請輸入帳號" onChange={handleChange} className=" text-base w-full px-4 py-3 rounded-lg bg-white mt-2 border focus:border-green-700 focus:bg-white focus:outline-none" autoFocus required />
            </div>
            <div className="mt-4">
              <label className="block text-gray-700 text-base">密碼</label>
              <input type="password" name="password" placeholder="請輸入密碼" minLength="6" onChange={handleChange} className=" text-base w-full px-4 py-3 rounded-lg bg-white mt-2 border focus:border-green-700 focus:bg-white focus:outline-none" required />
              {error && <span className=' text-xs text-red-600'>{error}</span>}
            </div>
            {/* <p className='text-gray-400 bg-white flex items-center justify-center'><hr className="my-6 border-gray-300 w-1/2" />or<hr className="my-6 border-gray-300 w-1/2" /></p>
            <button className=''><button className=''><button className=''>Google</button>FB</button>Apple</button> */}

            <button type="submit" onClick={handleSubmit} style= { {backgroundColor:"#5BA491" } } className="w-full block  text-white font-semibold rounded-lg px-4 py-3 mt-6 text-base">登入</button>
          </form>
          <p className="mt-8 text-gray-400">
            還沒有帳號? 
            <span style= { {color:"#5BA491" } } className="text-blue-500 hover:text-blue-700 font-semibold ml-2">
              <Link to="/register">Sign up</Link> 
            </span>
          </p>
        </div>
      </div>
  </section>
  )
}
