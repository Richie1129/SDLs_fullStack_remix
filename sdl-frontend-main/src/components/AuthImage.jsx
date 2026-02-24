import { useState, useEffect, useRef } from 'react';
import apiClient from '@/api/client';

/**
 * AuthImage - 需要登入驗證的圖片元件
 *
 * 針對 /api/file/image/* 端點，透過 apiClient（附帶 accessToken）
 * 以 fetch 取得圖片 blob，轉為 Object URL 後渲染。
 * 非 API 圖片（頭像等）直接以 <img> 渲染，不做額外處理。
 */
const AuthImage = ({ src, alt = '', className = '', style, onClick, fallback = null }) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(false);
  const prevBlobUrl = useRef(null);

  const isApiImage = src && (
    src.includes('/api/file/image/') ||
    src.includes('/file/image/')
  );

  useEffect(() => {
    if (!isApiImage) return;

    let cancelled = false;
    setError(false);
    setBlobUrl(null);

    // 從 src 中取出相對路徑部分（去除 baseURL 前綴）
    // 例：/api/file/image/xxx → /file/image/xxx
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    let path = src;
    if (src.startsWith(apiBaseUrl)) {
      path = src.slice(apiBaseUrl.length);
    } else if (src.startsWith('/api/')) {
      path = src.slice(4); // 移除 '/api' 前綴
    }

    apiClient
      .get(path, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        const url = URL.createObjectURL(res.data);
        // 釋放上一個 blob URL
        if (prevBlobUrl.current) {
          URL.revokeObjectURL(prevBlobUrl.current);
        }
        prevBlobUrl.current = url;
        setBlobUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [src, isApiImage]);

  // 元件卸載時釋放 blob URL
  useEffect(() => {
    return () => {
      if (prevBlobUrl.current) {
        URL.revokeObjectURL(prevBlobUrl.current);
      }
    };
  }, []);

  // 非 API 圖片：直接渲染
  if (!isApiImage) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={style}
        onClick={onClick}
      />
    );
  }

  // 載入失敗
  if (error) {
    return fallback ? (
      fallback
    ) : (
      <div
        className={`flex items-center justify-center bg-gray-100 text-gray-400 text-xs ${className}`}
        style={style}
        onClick={onClick}
      >
        圖片載入失敗
      </div>
    );
  }

  // 載入中或已取得 blob
  return (
    <img
      src={blobUrl || undefined}
      alt={alt}
      className={`${className} ${!blobUrl ? 'opacity-0' : 'opacity-100'} transition-opacity duration-fast`}
      style={style}
      onClick={onClick}
    />
  );
};

export default AuthImage;
