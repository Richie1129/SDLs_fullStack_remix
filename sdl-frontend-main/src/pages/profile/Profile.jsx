import { useState, useEffect } from 'react';
import { getCurrentUser, updateUserProfile, updateUserPassword } from '../../api/users';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaArrowLeft, FaEdit, FaSave, FaTimes, FaEye, FaEyeSlash } from 'react-icons/fa';
import { FiAlertTriangle } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { triggerUserUpdate } from '../../utils/userUtils';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState({
    username: '',
    account: '',
    email: '',
    class_name: '',
    seat_number: '',
    school_name: ''
  });
  const [originalUser, setOriginalUser] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const role = localStorage.getItem("role");
  const isTeacher = role === 'teacher';
  // 只允許編輯 email，其他資料保持鎖定
  const canEditEmail = true;
  const canEditProfile = false;

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const userData = await getCurrentUser();
      const userInfo = {
        username: userData.username || '',
        account: userData.account || '',
        email: userData.email || '',
        class_name: userData.class || '',
        seat_number: userData.seatNumber || '',
        school_name: userData.school
          ? `${userData.school.name}（${userData.school.city}）`
          : ''
      };
      setUser(userInfo);
      setOriginalUser(userInfo);
    } catch (error) {
      console.error('獲取用戶資料失敗:', error);
      Swal.fire({
        icon: 'error',
        title: '錯誤',
        text: '無法獲取用戶資料'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUser(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      // 只更新 email，其他資料保持原樣
      const updateData = {
        username: originalUser.username,  // 保持原樣
        email: user.email,  // 只更新 email
        class: originalUser.class_name,   // 保持原樣
        seatNumber: originalUser.seat_number  // 保持原樣
      };

      await updateUserProfile(updateData);

      // 更新 localStorage 的 email
      if (user.email) {
        localStorage.setItem('email', user.email);
      }

      // 更新 originalUser，只更新 email
      setOriginalUser({
        ...originalUser,
        email: user.email
      });
      setIsEditing(false);
      Swal.fire({
        icon: 'success',
        title: '成功',
        text: '電子郵件已更新',
        showConfirmButton: false,
        timer: 1500
      });
    } catch (error) {
      console.error('更新用戶資料失敗:', error);
      // 發生錯誤時，恢復原始資料
      setUser(originalUser);
      Swal.fire({
        icon: 'error',
        title: '錯誤',
        text: error.response?.data?.message || '更新失敗，請稍後再試'
      });
    }
  };

  const handleCancel = () => {
    // 只回復 email，其他欄位保持不變
    setUser({
      ...user,
      email: originalUser.email
    });
    setIsEditing(false);
  };

  const handlePasswordSubmit = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Swal.fire({
        icon: 'error',
        title: '錯誤',
        text: '新密碼與確認密碼不一致'
      });
      return;
    }

    if (passwordData.newPassword.length < 8 || !/[A-Za-z]/.test(passwordData.newPassword) || !/\d/.test(passwordData.newPassword)) {
      Swal.fire({
        icon: 'error',
        title: '錯誤',
        text: '密碼至少需要 8 個字元，並包含英文字母與數字'
      });
      return;
    }

    try {
      await updateUserPassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordForm(false);

      Swal.fire({
        icon: 'success',
        title: '成功',
        text: '密碼已更新',
        showConfirmButton: false,
        timer: 1500
      });
    } catch (error) {
      console.error('更新密碼失敗:', error);
      Swal.fire({
        icon: 'error',
        title: '錯誤',
        text: error.response?.data?.message || '密碼更新失敗'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFB] flex items-center justify-center">
        <div className="bg-white p-component-lg rounded-xl shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5BA491] mx-auto mb-4"></div>
          <div className="text-body-lg text-gray-600">載入中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-stack-sm">
            <button
              onClick={() => navigate('/homepage')}
              className="p-component-xs text-gray-600 hover:text-[#5BA491] hover:bg-[#5BA491]/10 rounded-lg transition-colors"
              title="返回首頁"
            >
              <FaArrowLeft className="text-body-lg" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="p-component-xs bg-[#5BA491]/10 rounded-lg">
                <FaUser className="text-[#5BA491] text-h3" />
              </div>
              <h1 className="text-h2 font-bold text-gray-800">個人資料</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-[#5BA491] to-[#4A9480] px-6 py-8">
            <div className="flex items-center space-x-stack-sm">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                <FaUser className="text-[#5BA491] text-h2" />
              </div>
              <div>
                <h2 className="text-h2 font-bold text-white">{user.username || '使用者'}</h2>
                <p className="text-white/80 text-body-lg">
                  {role === 'teacher' ? '教師' : '學生'} • {user.account}
                </p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-component-md-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
              {/* 基本資料表單 */}
              <div className="space-y-stack-sm">
                <h3 className="text-body-lg font-semibold text-gray-800 flex items-center space-x-stack-xs">
                  <FaUser className="text-[#5BA491]" />
                  <span>基本資料</span>
                </h3>

                <div>
                  <label className="block text-body-sm font-medium text-gray-700 mb-2">
                    姓名
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={user.username}
                    onChange={handleInputChange}
                    disabled={!canEditProfile}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5BA491] focus:border-transparent transition-colors ${
                      !canEditProfile ? 'bg-gray-50 text-gray-500' : 'bg-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-body-sm font-medium text-gray-700 mb-2">
                    帳號
                  </label>
                  <input
                    type="text"
                    value={user.account}
                    disabled
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-caption text-gray-500 mt-1">帳號無法修改</p>
                </div>

                <div>
                  <label className="block text-body-sm font-medium text-gray-700 mb-2">
                    學校
                  </label>
                  <input
                    type="text"
                    value={user.school_name}
                    disabled
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                    placeholder="（未設定）"
                  />
                </div>

                <div>
                  <label className="block text-body-sm font-medium text-gray-700 mb-2">
                    電子郵件
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={user.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5BA491] focus:border-transparent transition-colors ${
                      !isEditing ? 'bg-gray-50 text-gray-500' : 'bg-white'
                    }`}
                    placeholder="請輸入您的電子郵件"
                  />
                  {user.email && user.email.endsWith('@example.com') && (
                    <p className="text-caption text-orange-600 mt-1">
                      <FiAlertTriangle className="w-3.5 h-3.5 inline mr-1" />請更新您的真實電子郵件地址
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-body-sm font-medium text-gray-700 mb-2">
                    班級
                  </label>
                  <input
                    type="text"
                    name="class_name"
                    value={user.class_name}
                    onChange={handleInputChange}
                    disabled={!canEditProfile}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5BA491] focus:border-transparent transition-colors ${
                      !canEditProfile ? 'bg-gray-50 text-gray-500' : 'bg-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-body-sm font-medium text-gray-700 mb-2">
                    座號
                  </label>
                  <input
                    type="text"
                    name="seat_number"
                    value={user.seat_number}
                    onChange={handleInputChange}
                    disabled={!canEditProfile}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5BA491] focus:border-transparent transition-colors ${
                      !canEditProfile ? 'bg-gray-50 text-gray-500' : 'bg-white'
                    }`}
                  />
                </div>

                {/* 操作按鈕 */}
                <div className="pt-4 flex flex-col space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-component-sm">
                    <div className="flex items-center space-x-stack-xs">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <p className="text-body-sm text-blue-800 font-medium">
                        目前僅開放電子郵件編輯功能
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center space-x-stack-xs px-6 py-3 bg-[#5BA491] text-white rounded-lg hover:bg-[#4A9480] transition-colors font-medium"
                      >
                        <FaEdit />
                        <span>編輯資料</span>
                      </button>
                    ) : (
                    <>
                        <button
                          onClick={handleSave}
                          className="flex items-center space-x-stack-xs px-6 py-3 bg-[#5BA491] text-white rounded-lg hover:bg-[#4A9480] transition-colors font-medium"
                        >
                          <FaSave />
                          <span>保存</span>
                        </button>
                        <button
                          onClick={handleCancel}
                          className="flex items-center space-x-stack-xs px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                        >
                          <FaTimes />
                          <span>取消</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 密碼修改區域 */}
              <div className="space-y-stack-sm">
                <h3 className="text-body-lg font-semibold text-gray-800 flex items-center space-x-stack-xs">
                  <FaLock className="text-[#5BA491]" />
                  <span>密碼管理</span>
                </h3>

                <div className="bg-gray-50 rounded-lg p-component-base">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-component-sm mb-4">
                    <div className="flex items-center space-x-stack-xs">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      <p className="text-body-sm text-yellow-800 font-medium">
                        密碼修改功能暫時關閉
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    disabled={true}
                    className="w-full flex items-center justify-center space-x-stack-xs px-4 py-3 border border-gray-300 rounded-lg transition-colors font-medium bg-gray-200 text-gray-500 cursor-not-allowed border-gray-200"
                  >
                    <FaLock />
                    <span>{showPasswordForm ? '隱藏密碼表單' : '修改密碼'}</span>
                  </button>

                  {showPasswordForm && canEdit && (
                    <div className="mt-4 space-y-stack-sm">
                      <div>
                        <label className="block text-body-sm font-medium text-gray-700 mb-2">
                          目前密碼
                        </label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? "text" : "password"}
                            name="currentPassword"
                            value={passwordData.currentPassword}
                            onChange={handlePasswordChange}
                            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5BA491] focus:border-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-body-sm font-medium text-gray-700 mb-2">
                          新密碼
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            name="newPassword"
                            value={passwordData.newPassword}
                            onChange={handlePasswordChange}
                            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5BA491] focus:border-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-body-sm font-medium text-gray-700 mb-2">
                          確認新密碼
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            name="confirmPassword"
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordChange}
                            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5BA491] focus:border-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        <button
                          onClick={handlePasswordSubmit}
                          className="flex-1 px-4 py-3 bg-[#5BA491] text-white rounded-lg hover:bg-[#4A9480] transition-colors font-medium"
                        >
                          更新密碼
                        </button>
                        <button
                          onClick={() => {
                            setPasswordData({
                              currentPassword: '',
                              newPassword: '',
                              confirmPassword: ''
                            });
                            setShowPasswordForm(false);
                          }}
                          className="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}