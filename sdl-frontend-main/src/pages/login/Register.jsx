import React, { useState, useContext, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from 'react-query';
import { userRegister, getSchools } from '../../api/users';
import { AuthContext } from '../../utils/AuthContext';
import Swal from 'sweetalert2';
import { authStorage, userStorage } from '../../services/storageService';
import { useTracking } from '../../providers/TrackingProvider';
import { MdArrowForward, MdSchool, MdGroups } from 'react-icons/md';
import { FiUser, FiLock, FiMail, FiHash, FiSearch, FiEye, FiEyeOff } from 'react-icons/fi';

export default function Register() {
  const [userData, setUserData] = useState({ role: 'student', class: '', seatNumber: '', school_id: '' });
  const [userContext, setUserContext] = useContext(AuthContext);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { track } = useTracking();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [schools, setSchools] = useState([]);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const schoolRef = useRef(null);

  useEffect(() => {
    getSchools()
      .then(data => setSchools(data || []))
      .catch(() => setSchools([]));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (schoolRef.current && !schoolRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSchools = schoolSearch.trim()
    ? schools.filter(s => s.name.includes(schoolSearch) || s.city.includes(schoolSearch)).slice(0, 15)
    : [];

  const handleSchoolSelect = (school) => {
    setSchoolSearch(school.name);
    setUserData(prev => ({ ...prev, school_id: school.id }));
    setShowSuggestions(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const validateInput = () => {
    if (!userData.school_id) { setError('請選擇學校'); return false; }
    if (!userData.account || userData.account.length < 6 || userData.account.length > 20) {
      setError('帳號長度應為 6-20 個字符'); return false;
    }
    if (!/^\d+$/.test(userData.account) && !/^[A-Za-z0-9]+$/.test(userData.account)) {
      setError('帳號只能包含字母或數字'); return false;
    }
    if (!userData.email) { setError('請輸入電子郵件'); return false; }
    if (!userData.confirmEmail) { setError('請確認電子郵件'); return false; }
    if (userData.confirmEmail !== userData.email) { setError('電子郵件不相符，請重新確認'); return false; }
    if (!userData.confirmPassword) { setError('請確認密碼'); return false; }
    if (userData.confirmPassword !== userData.password) { setError('密碼不相符'); return false; }
    if (!userData.password || userData.password.length < 8) { setError('密碼至少需要 8 個字元，並包含英文字母與數字'); return false; }
    if (!/\d/.test(userData.password) || !/[A-Za-z]/.test(userData.password)) {
      setError('密碼必須包含英文字母與數字'); return false;
    }
    setError('');
    return true;
  };

  const userRegisterMutation = useMutation(userRegister, {
    onSuccess: (res) => {
      // 與 Login.jsx 一致：使用 authStorage/userStorage namespace
      authStorage.set('accessToken', res.data.accessToken);
      if (res.data.refreshToken) authStorage.set('refreshToken', res.data.refreshToken);
      userStorage.setMultiple({
        id: res.data.id,
        account: res.data.account,
        email: res.data.email,
        username: res.data.username,
        role: res.data.role,
      });
      if (res.data.class) userStorage.set('class', res.data.class);
      if (res.data.seatNumber) userStorage.set('seatNumber', res.data.seatNumber);
      setUserContext(prev => ({
        ...prev,
        account: res.data.account,
        email: res.data.email,
        id: res.data.id,
        accessToken: res.data.accessToken,
        username: res.data.username,
        role: res.data.role,
        class: res.data.class,
        seatNumber: res.data.seatNumber,
      }));
      Swal.fire({ icon: 'success', title: '註冊成功！', text: '您已成功註冊！', confirmButtonText: '確定', timer: 2000, timerProgressBar: true, confirmButtonColor: '#5BA491' })
        .then(() => navigate('/homepage'));
    },
    onError: (err) => {
      if (err.response?.status === 400 && err.response?.data?.message === '該用戶已存在，請嘗試其他用戶名稱。') {
        Swal.fire({ icon: 'error', title: '註冊失敗', text: '該用戶已存在，請嘗試其他用戶名稱。', confirmButtonText: '確定', timer: 2000, timerProgressBar: true, confirmButtonColor: '#5BA491' });
      } else {
        setError('帳號或密碼錯誤');
        Swal.fire({ icon: 'error', title: '註冊失敗', text: '請檢查您的帳號或密碼！', confirmButtonText: '確定', timer: 2000, timerProgressBar: true, confirmButtonColor: '#5BA491' });
      }
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateInput()) {
      track('REGISTER_SUBMIT', 'user', null, { account: userData.account, role: userData.role, timestamp: new Date().toISOString() });
      userRegisterMutation.mutate(userData);
    }
  };

  const inputClass = 'w-full pl-10 pr-4 py-3 rounded-xl bg-paper-soft border border-line text-body focus:outline-none focus:border-customgreen focus:ring-2 focus:ring-customgreen/20 transition-all duration-fast';

  return (
    // 桌面：左右分欄 h-screen；手機：單欄全高可捲動
    <div className="flex min-h-screen md:h-screen md:overflow-hidden">

      {/* ── 左側：品牌面板（桌面才顯示，sticky） ── */}
      <div className="hidden md:flex flex-col justify-between w-1/2 sticky top-0 h-screen overflow-hidden px-12 lg:px-16 py-10 bg-customgreen flex-shrink-0">
        {/* 裝飾圓 */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-paper-soft/10 pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-paper-soft/[0.07] pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-baseline gap-3 motion-safe:animate-rise">
          <span className="text-white font-bold text-h2 tracking-tight">SDLS</span>
          <span className="text-white/50 text-body-sm">Self-Directed Learning</span>
        </div>

        {/* 主文案 */}
        <div className="relative z-10">
          <h1 className="text-white font-bold leading-snug text-h1 motion-safe:animate-rise" style={{ animationDelay: '150ms' }}>
            開始你的<br />探究之旅。
          </h1>
          <p className="text-white/70 text-body mt-4 leading-relaxed motion-safe:animate-rise" style={{ animationDelay: '300ms' }}>
            建立帳號後，即可使用任務看板、AI 教練與學習歷程等完整功能。
          </p>
          <div className="mt-8 flex flex-col gap-3">
            {[
              { icon: <MdGroups />, text: '加入你的班級專案' },
              { icon: <MdSchool />, text: '與同學即時協作' },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-3 motion-safe:animate-rise" style={{ animationDelay: `${450 + i * 100}ms` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-lg flex-shrink-0 bg-paper-soft/20">
                  {b.icon}
                </div>
                <span className="text-white/80 text-body-sm">{b.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 底部：返回登入 */}
        <div className="relative z-10 motion-safe:animate-rise" style={{ animationDelay: '650ms' }}>
          <p className="text-white/70 text-body">
            已有帳號？
            <Link to="/" className="text-white font-semibold ml-1 hover:underline">返回登入</Link>
          </p>
        </div>
      </div>

      {/* ── 右側：表單區（桌面內部捲動；手機全寬頁面捲動） ── */}
      <div className="w-full md:w-1/2 md:h-screen md:overflow-y-auto bg-paper flex flex-col">

        {/* ── 手機版品牌頭部（桌面隱藏） ── */}
        <div className="md:hidden bg-customgreen px-6 pt-10 pb-6 flex-shrink-0">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-white font-bold text-h2 tracking-tight">SDLS</span>
            <span className="text-white/60 text-body-sm">Self-Directed Learning</span>
          </div>
          <p className="text-white/75 text-body-sm leading-relaxed">
            建立帳號，開始你的自主探究之旅。
          </p>
        </div>

        {/* ── 表單內容 ── */}
        <div className="px-6 sm:px-10 md:px-8 lg:px-20 xl:px-28 py-8 md:py-10 flex-1">
          <div className="w-full max-w-lg mx-auto motion-safe:animate-rise" style={{ animationDelay: '200ms' }}>
            <div className="mb-7">
              <h2 className="text-h1 font-bold text-ink">建立帳號</h2>
              <p className="text-body-sm text-ink-muted mt-1">填寫以下資訊完成註冊</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              {/* 學校 */}
              <div ref={schoolRef} className="relative">
                <label className="block text-body-sm font-medium text-ink mb-1.5">學校</label>
                <div className="relative">
                  <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle text-lg pointer-events-none" />
                  <input
                    type="text"
                    placeholder="輸入學校名稱或縣市搜尋"
                    value={schoolSearch}
                    onChange={e => {
                      setSchoolSearch(e.target.value);
                      setUserData(prev => ({ ...prev, school_id: '' }));
                      setShowSuggestions(true);
                    }}
                    onFocus={() => schoolSearch.trim() && setShowSuggestions(true)}
                    className={inputClass}
                    autoComplete="off"
                  />
                </div>
                {showSuggestions && filteredSchools.length > 0 && (
                  <ul className="absolute z-50 w-full bg-paper-soft border border-line rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {filteredSchools.map(school => (
                      <li
                        key={school.id}
                        onMouseDown={() => handleSchoolSelect(school)}
                        className="px-4 py-2.5 cursor-pointer hover:bg-customgreen/5 text-body-sm flex justify-between items-center"
                      >
                        <span>{school.name}</span>
                        <span className="text-caption text-ink-subtle">{school.city}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {schoolSearch.trim() && !userData.school_id && filteredSchools.length === 0 && (
                  <p className="text-caption text-ink-subtle mt-1">查無符合的學校</p>
                )}
              </div>

              {/* 姓名 */}
              <div>
                <label className="block text-body-sm font-medium text-ink mb-1.5">姓名</label>
                <div className="relative">
                  <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle text-lg pointer-events-none" />
                  <input type="text" name="username" placeholder="請輸入姓名" onChange={handleChange} className={inputClass} required />
                </div>
              </div>

              {/* 帳號 */}
              <div>
                <label className="block text-body-sm font-medium text-ink mb-1.5">帳號</label>
                <div className="relative">
                  <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle text-lg pointer-events-none" />
                  <input type="text" name="account" placeholder="請輸入帳號（學號）" onChange={handleChange} className={inputClass} required />
                </div>
              </div>

              {/* 電子郵件 */}
              <div>
                <label className="block text-body-sm font-medium text-ink mb-1.5">電子郵件</label>
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle text-lg pointer-events-none" />
                  <input type="email" name="email" placeholder="請輸入電子郵件" onChange={handleChange} className={inputClass} required />
                </div>
              </div>

              {/* 確認電子郵件 */}
              <div>
                <label className="block text-body-sm font-medium text-ink mb-1.5">確認電子郵件</label>
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle text-lg pointer-events-none" />
                  <input type="email" name="confirmEmail" placeholder="再次輸入電子郵件" onChange={handleChange} className={inputClass} required autoComplete="off" />
                </div>
              </div>

              {/* 密碼 / 確認密碼（手機單欄，sm 以上並排） */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-body-sm font-medium text-ink mb-1.5">密碼</label>
                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle text-lg pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'} name="password"
                      placeholder="至少 8 碼，含英數" minLength="8"
                      onChange={handleChange} className={`${inputClass} pr-10`} required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink-muted transition-colors duration-fast"
                    >
                      {showPassword ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-body-sm font-medium text-ink mb-1.5">確認密碼</label>
                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle text-lg pointer-events-none" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword"
                      placeholder="再輸入一次密碼" minLength="8"
                      onChange={handleChange} className={`${inputClass} pr-10`} required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(prev => !prev)}
                      aria-label={showConfirmPassword ? '隱藏密碼' : '顯示密碼'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink-muted transition-colors duration-fast"
                    >
                      {showConfirmPassword ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* 班級 / 座號（註冊帳號一律為學生；教師由管理員後台開通，後端會忽略任何 role 參數） */}
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-body-sm font-medium text-ink mb-1.5">班級</label>
                  <div className="relative">
                    <MdGroups className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle text-lg pointer-events-none" />
                    <input type="text" name="class" placeholder="例：301" value={userData.class} onChange={handleChange} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="block text-body-sm font-medium text-ink mb-1.5">座號</label>
                  <div className="relative">
                    <FiHash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle text-lg pointer-events-none" />
                    <input type="text" name="seatNumber" placeholder="例：15" value={userData.seatNumber} onChange={handleChange} className={inputClass} />
                  </div>
                </div>
              </div>
              <p className="text-caption text-ink-muted">
                註冊帳號一律為學生身份；教師帳號請由管理員於後台開通。
              </p>

              {/* 錯誤訊息 */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-body-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={userRegisterMutation.isLoading}
                className="w-full flex items-center justify-center gap-2 text-white font-semibold rounded-xl py-3 text-body bg-customgreen hover:bg-customgreen/90 transition-colors duration-fast disabled:opacity-60 mt-1"
              >
                {userRegisterMutation.isLoading ? '註冊中...' : '建立帳號'}
                {!userRegisterMutation.isLoading && <MdArrowForward className="text-lg" />}
              </button>
            </form>

            {/* 手機版底部返回登入 */}
            <p className="mt-6 text-body-sm text-ink-muted md:hidden text-center">
              已有帳號？
              <Link to="/" className="font-semibold ml-1 text-customgreen hover:underline">返回登入</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
