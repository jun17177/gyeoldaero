import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';

interface Props {
  variant?: 'primary' | 'white';
  scale?: number;
}

// Primary color logo  — viewBox 0 0 200 80
const PRIMARY_PATH = 'M20 28 Q35 18 50 28 Q65 38 80 28 Q95 18 110 28 Q125 38 140 28 Q155 18 170 28 Q185 38 180 28';
const PRIMARY_COLOR = '#3D5A73';

// White logo — viewBox 0 0 220 85
const WHITE_PATH = 'M25 28 Q40 16 55 28 Q70 40 85 28 Q100 16 115 28 Q130 40 145 28 Q160 16 175 28 Q190 40 195 28';

export default function WaveLogo({ variant = 'primary', scale = 1 }: Props) {
  if (variant === 'white') {
    const w = Math.round(220 * scale);
    const h = Math.round(85 * scale);
    return (
      <View>
        <Svg width={w} height={h} viewBox="0 0 220 85">
          <Path
            d={WHITE_PATH}
            fill="none"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <SvgText
            x="110"
            y="72"
            textAnchor="middle"
            fontFamily="serif"
            fontSize="38"
            fontWeight="900"
            fill="#ffffff"
            letterSpacing="-1.5"
          >
            결대로
          </SvgText>
        </Svg>
      </View>
    );
  }

  const w = Math.round(200 * scale);
  const h = Math.round(80 * scale);
  return (
    <View>
      <Svg width={w} height={h} viewBox="0 0 200 80">
        <Path
          d={PRIMARY_PATH}
          fill="none"
          stroke={PRIMARY_COLOR}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <SvgText
          x="100"
          y="68"
          textAnchor="middle"
          fontFamily="serif"
          fontSize="36"
          fontWeight="900"
          fill={PRIMARY_COLOR}
          letterSpacing="-1"
        >
          결대로
        </SvgText>
      </Svg>
    </View>
  );
}
