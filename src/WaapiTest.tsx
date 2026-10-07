import React from 'react';
import { AbsoluteFill } from 'remotion';

const v = (o: Record<string, string | number>) => o as React.CSSProperties;
export const WaapiTest: React.FC = () => {
  React.useLayoutEffect(() => { console.log('MEASURE ' + JSON.stringify({ hello: 1 })); });
  return (
  <AbsoluteFill style={{ background: '#000', flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 10 }}>
    <style>{`@keyframes fi{from{opacity:0}to{opacity:1}}
    .base::after{content:'';position:absolute;inset:0;background:red;animation:fi 10s linear both}
    .wrap .base.on::after{animation-play-state:paused !important;animation-delay:calc(var(--p-at, 0) * -1s) !important}
    .base2::after{content:'';position:absolute;inset:0;background:red;animation:fi 10s linear both; animation-delay: 2s}
    .wrap .base2.on::after{animation-play-state:paused !important;animation-delay:calc(var(--p-at, 0) * -1s) !important}
    `}</style>
    <div className="wrap" style={{ display: 'flex', gap: 10 }}>
      <div className="base on" style={v({ width: 100, height: 100, position: 'relative', '--p-at': 2.5 })} />
      <div className="base2 on" style={v({ width: 100, height: 100, position: 'relative', '--p-at': 7.5 })} />
    </div>
  </AbsoluteFill>
);
};
