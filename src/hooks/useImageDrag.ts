import { SkPath } from "@shopify/react-native-skia";
import { useRef, useEffect, useState } from "react";
import { PanResponder, Platform } from "react-native";
import { Gesture, NativeGesture } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";

export const useImageDrag = (setPosPoints?:(x:number, y:number) => void) => {
    const offset = useSharedValue({ x: 0, y: 0 });
    const start = useSharedValue({ x: 0, y: 0 });
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const rotation = useSharedValue(0);
    const savedRotation = useSharedValue(0);

    const webZoom = (e:WheelEvent) => {
        scale.value = scale.value + (e.deltaY/-1000);
        savedScale.value = scale.value
        console.log(scale.value);
    }

    useEffect(() => {
        if (Platform.OS === 'web') {
            window.addEventListener('wheel', webZoom, { passive: true });
    
            return () => {
                window.removeEventListener('wheel', webZoom);
            };
        }
        
    }, []);

    const animatedStyles = useAnimatedStyle(() => {
        return {
            transform: [
            { translateX: offset.value.x },
            { translateY: offset.value.y },
            { scale: scale.value },
            { rotateZ: `${rotation.value}rad` },
            ],
        };
    });

    const dragGesture = Gesture.Pan()
        .averageTouches(true)
        .onUpdate((e) => {
            offset.value = {
            x: e.translationX + start.value.x,
            y: e.translationY + start.value.y,
            };
        })
        .onEnd(() => {
            start.value = {
            x: offset.value.x,
            y: offset.value.y,
            };
        });

    const zoomGesture = Gesture.Pinch()
        .onUpdate((event) => {
            scale.value = savedScale.value * event.scale;
        })
        .onEnd(() => {
            savedScale.value = scale.value;
        });

    const rotateGesture = Gesture.Rotation()
    .onUpdate((event) => {
        rotation.value = savedRotation.value + event.rotation;
    })
    .onEnd(() => {
        savedRotation.value = rotation.value;
    });

    const tapGesture = Gesture.Tap().runOnJS(true).onEnd((e) => {
        console.log(e.x);
        // runOnJS(() => setPosPoints?.(e.x, e.y))();
        setPosPoints?.(e.x, e.y)
    });

    const composed = Gesture.Simultaneous(
        dragGesture,
        Gesture.Simultaneous(zoomGesture, rotateGesture),
        tapGesture
    );
    

    return { composed, animatedStyles, scale };

};