import { InferenceSession } from "onnxruntime-react-native";
import { useEffect, useState } from "react";

const useSAM = () => {
    const [mask_threshold, setMaskThreshold] = useState(0.0);
    const [img_size, setImgSize] = useState(1024);
    const [pixel_mean, setPixelMean] = useState([123.675, 116.28, 103.53]);
    const [pixel_std, setPixelStd] = useState([58.395, 57.12, 57.375]);
    const [encoder, setEncoder] = useState<InferenceSession>();
    const [decoder, setDecoder] = useState<InferenceSession>();

    // const encoder: InferenceSession = await InferenceSession.create('models/encoder.onnx');
    // const decoder: InferenceSession = await InferenceSession.create('models/decoder.onnx');

    const predict = (point_coords?:number[], point_labels?:number[]) => {

    };

    // useEffect(() => {
    //     if (!encoder && !decoder) {
    //         InferenceSession.create('models/encoder.onnx').then((encoder) => setEncoder(encoder));
    //         InferenceSession.create('models/decoder.onnx').then((decoder) => setDecoder(decoder));
    //     }
    // },[])
};
