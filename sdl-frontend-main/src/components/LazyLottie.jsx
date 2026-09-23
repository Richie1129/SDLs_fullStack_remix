import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Lottie from 'lottie-react';

/**
 * 需要顯示時才下載動畫 JSON 的 Lottie。
 * 大型動畫（完成畫面、空狀態）若直接 import 會被打進頁面 chunk，進頁面就得下載數百 kB。
 *
 * load 必須是穩定參照（定義在模組層級），例如：
 *   const loadIcon = () => import('../assets/AnimationXxx.json');
 * 下載完成前以同尺寸的空白佔位；下載失敗時維持空白，不影響頁面其他內容。
 */
export default function LazyLottie({ load, className, aspectRatio, ...lottieProps }) {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((mod) => {
        if (!cancelled) setAnimationData(mod.default);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [load]);

  if (!animationData) {
    return <div className={className} style={aspectRatio ? { aspectRatio } : undefined} aria-hidden="true" />;
  }

  return <Lottie className={className} animationData={animationData} {...lottieProps} />;
}

LazyLottie.propTypes = {
  load: PropTypes.func.isRequired,
  className: PropTypes.string,
  // 佔位框的寬高比（例如 "512 / 512"），避免動畫載入後版面跳動
  aspectRatio: PropTypes.string,
};
