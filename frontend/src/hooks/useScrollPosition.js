import { useRef } from 'react';
import { Animated } from 'react-native';

export const useScrollPosition = () => {
  const scrollY = useRef(new Animated.Value(0)).current;

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  return { scrollY, onScroll };
};
