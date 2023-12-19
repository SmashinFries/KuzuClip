global.Buffer = require('buffer').Buffer;
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { InferenceSession, Tensor, } from 'onnxruntime-react-native';
import { useEffect, useState } from 'react';
import { Asset } from 'expo-asset';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import { Box, Canvas, Circle, Fill, Group, Image, Rect, SkImage, Skia } from '@shopify/react-native-skia';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { GestureDetector, Gesture, GestureHandlerRootView } from "react-native-gesture-handler";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useImageDrag } from './src/hooks/useImageDrag';
import { usePointStore } from './src/store/points';
import { IconButton } from 'react-native-paper';
// import { Image } from 'expo-image';

function tensorToImageData(tensor: Tensor): string {
  // 1. Extract the data from the tensor and convert it back to a regular JavaScript array.
  const float32Data = tensor.data as Float32Array;
  const transposedData = Array.from(float32Data).map(value => value * 255.0); // convert back from float

  // 2. Split the array into three equal parts, representing the red, green, and blue channels.
  const channelSize = transposedData.length / 3;
  const redArray = transposedData.slice(0, channelSize);
  const greenArray = transposedData.slice(channelSize, channelSize * 2);
  const blueArray = transposedData.slice(channelSize * 2, channelSize * 3);

  // 3. Loop through these arrays simultaneously, combining one element from each into a single pixel, and add an alpha channel.
  let imageData = [];
  for (let i = 0; i < channelSize; i++) {
    imageData.push(redArray[i], greenArray[i], blueArray[i], 255); // add alpha channel
  }

  // 4. Create a new Buffer from the resulting array.
  const imageBufferb64 = Buffer.from(imageData).toString('base64');
  return imageBufferb64;
}

function imageDataToTensor(image: Buffer, dims: number[]): Tensor {
  // 1. Get buffer data from image and create R, G, and B arrays.
  var imageBufferData = image;
  const [redArray, greenArray, blueArray] = new Array(new Array<number>(), new Array<number>(), new Array<number>());

  // 2. Loop through the image buffer and extract the R, G, and B channels
  for (let i = 0; i < imageBufferData.length; i += 4) {
    redArray.push(imageBufferData[i]);
    greenArray.push(imageBufferData[i + 1]);
    blueArray.push(imageBufferData[i + 2]);
    // skip data[i + 3] to filter out the alpha channel
  }

  // 3. Concatenate RGB to transpose [224, 224, 3] -> [3, 224, 224] to a number array
  const transposedData = redArray.concat(greenArray).concat(blueArray);

  // 4. convert to float32
  let i, l = transposedData.length; // length, we need this for the loop
  // create the Float32Array size 3 * 224 * 224 for these dimensions output
  const float32Data = new Float32Array(dims[1] * dims[2] * dims[3]);
  for (i = 0; i < l; i++) {
    float32Data[i] = transposedData[i] / 255.0; // convert to float
  }
  // 5. create the tensor object from onnxruntime-web.
  const inputTensor = new Tensor("float32", float32Data, dims);
  return inputTensor;
}

const getImageBuffer = async (uri: string): Promise<Buffer|undefined> => {
  try {
    console.log('Reading file from uri: ', uri);
    const response = await fetch(uri);
    const imageDataArrayBuffer = await response.arrayBuffer();
    const fileContent = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const buffer = Buffer.from(fileContent, 'base64');
    const float32img = Float32Array.from(buffer)
    
    return buffer;
  } catch (error) {
    console.error(error);
    // return new Float32Array();
  }
};

export default function App() {
  const [encoder, setEncoder] = useState<InferenceSession>();
  const [decoder, setDecoder] = useState<InferenceSession>();
  const [imageUri, setImageUri] = useState<string|null>(null);
  const [displayImg, setDisplayImg] = useState<SkImage|null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const {height, width} = useWindowDimensions();

  const [mask_img, setMaskImg] = useState<SkImage|null>(null);

  const [activePoint, setActivePoint] = useState<'pos'|'neg'>('pos');
  const {posPoints, addPosPoint, addNegPoint, deleteAllPoints} = usePointStore();

  const {animatedStyles, composed} = useImageDrag((x, y) => displayImg ? addPosPoint(x, y) : null);

  const pickImage = async () => {
    ImagePicker.requestMediaLibraryPermissionsAsync();
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 1,
      base64: true
    });

    if (!result.canceled) {
      deleteAllPoints();
      const scale = 1024 / Math.max(result.assets[0].width, result.assets[0].height);
      const manipResult = await manipulateAsync(
        result.assets[0].uri,
        [{ resize: {width:scale * result.assets[0].width, height: scale * result.assets[0].height } }],
        { compress: 0.75, format: SaveFormat.JPEG, base64:true }
      );
      if (manipResult.base64) {
        const data = Skia.Data.fromBase64(manipResult.base64)
        const image = Skia.Image.MakeImageFromEncoded(data);
        setDisplayImg(image);
      }
      setImageUri(manipResult.uri);
    }
  };

  const loadModels = async () => {
    const assets = await Asset.loadAsync([require('./assets/models/encoder.onnx'), require('./assets/models/decoder.onnx')]);
    const eUri = assets[0].localUri;
    const dUri = assets[1].localUri;
    if (!eUri || !dUri) {
      Alert.alert('Error', 'Failed to load models');
    } else {
      const e = await InferenceSession.create(eUri);
      const d = await InferenceSession.create(dUri);
      setEncoder(e);
      setDecoder(d);
      console.log('Models loaded');
      console.log('Encoder input names: ', e.inputNames);
      console.log('Encoder output names: ', e.outputNames);
      console.log('Decoder input names: ', d.inputNames);
      console.log('Decoder output names: ', d.outputNames);
    }
  };

  const unloadModels = async() => {
    await encoder?.release();
    await decoder?.release();
    setEncoder(undefined);
    setDecoder(undefined);
  };

  const runEncoder = async () => {
    if (imageUri && encoder) {
      console.log('encoding image');
      const feeds: Record<string, Tensor> = {};
      const bufferData = await getImageBuffer(imageUri);
      // const dataLength = imageFloat32ArrayData.length;
      if (bufferData) {
        const imageTensor = imageDataToTensor(bufferData, [1, 3, 1024, 1024])
        feeds[encoder.inputNames[0]] = imageTensor;
        console.log('Encoder input names: ', encoder.inputNames);
        const result = await encoder?.run(feeds);
        if (result) {
          console.log('Encoder completed!');
          return result['image_embeddings'];
        } else {
          console.log('Encoder result: undefined');
        }
      }
    } else {
      console.log('image or encoder not loaded');
    }
  };

  const getCoords = (points:number[][]) => {
    let coordsCopy:number[][] = JSON.parse(JSON.stringify(points)).map(points => points.map(Number));
    console.log('coordsCopy: ', coordsCopy);
    return coordsCopy;
    // old_h, old_w = original_size
    //     new_h, new_w = self.get_preprocess_shape(
    //         original_size[0], original_size[1], self.target_length
    //     )
    //     coords = deepcopy(coords).astype(float)
    //     coords[..., 0] = coords[..., 0] * (new_w / old_w)
    //     coords[..., 1] = coords[..., 1] * (new_h / old_h)
    //     return coords
  };

  const runInference = async () => {
    setIsLoading(true);
    const image_embeddings = await runEncoder();
    const coords:number[][] = getCoords(posPoints.map((point) => [Math.round(point.x), Math.round(point.y)]));
    const flat_coords = coords.flat();
    const points_label = new Float32Array(posPoints.map((point) => 1));
    if (image_embeddings) {
      const inputs = {
        'image_embeddings': image_embeddings,
        'point_coords': new Tensor('float32', new Float32Array(flat_coords), [1, coords.length, 2]),
        'point_labels': new Tensor(points_label, [1, coords.length])
      }
      try {
        const results = await decoder?.run(inputs);
        if (results) {
          console.log('Decoder completed!');
          const scores = results['scores']
          const masks = results['masks']

          console.log(masks.type);
          console.log(masks.dims);
          console.log(masks.size);
          const data = Skia.Data.fromBase64(tensorToImageData(masks));
          const image = Skia.Image.MakeImageFromEncoded(data);
          console.log('image: ', image?.width());
          // setMaskImg(image);
        }
      } catch (error) {
        console.error(error);
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!displayImg) {
      deleteAllPoints();
    }
  },[displayImg])

  return (
    <GestureHandlerRootView style={{ flex: 1, }}>
    <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
        <GestureDetector gesture={composed}>
            <Animated.View style={[animatedStyles]}>
                <Canvas style={{ width:displayImg?.width() ?? width, height:displayImg?.height() ?? height}}>
                    {displayImg && <Image fit={'contain'} x={0} y={0} image={displayImg} width={displayImg?.width() ?? width} height={displayImg?.height() ?? height} />}
                    {mask_img && <Image fit={'contain'} x={0} y={0} image={mask_img} width={mask_img?.width() ?? width} height={mask_img?.height() ?? height} />}
                    {displayImg && posPoints.map((point, index) => <Circle key={index} r={10} cx={point.x} cy={point.y} color={'green'}  />)}
                </Canvas>
            </Animated.View>
        </GestureDetector>
      
      {/* {isLoading && <ActivityIndicator size={'large'} />} */}
      {/* <Text>Encoder: {encoder ? 'loaded' : 'not loaded'}</Text>
      <Text>Decoder: {decoder ? 'loaded' : 'not loaded'}</Text>
      <Text>Image: {image ? 'loaded' : 'not loaded'}</Text>
      <Button title="Load models" onPress={loadModels} />
      <Button title="Unload models" onPress={unloadModels} />
      <Button title="Pick an image" onPress={pickImage} />
      <Button title="Run encoder" onPress={runEncoder} /> */}
      <View style={{position:'absolute', bottom:0, alignItems:'center', justifyContent:'center', paddingBottom:20, flexDirection:'row', width:width}}>
        <IconButton icon={encoder && decoder ? 'upload' : 'upload-outline'} size={38} onPress={loadModels} />
        <IconButton icon={'image-plus'} size={38} onPress={pickImage} />
        {<IconButton icon={'play-outline'} size={38} onPress={runInference} />}
        
      </View>
      <View style={{position:'absolute', top:20, alignItems:'center', justifyContent:'space-evenly', paddingTop:20, flexDirection:'row', width:width}}>
        <MaterialCommunityIcons name={activePoint ==='pos' ? 'plus-circle' : 'plus-circle-outline'} onPress={() => setActivePoint('pos')} color={'green'} size={38} />
        <Button title="Reset" onPress={() => deleteAllPoints()} />
        <MaterialCommunityIcons name={activePoint ==='neg' ? 'minus-circle' : 'minus-circle-outline'} onPress={() => setActivePoint('neg')} color={'red'} size={38} />
      </View>
      <StatusBar style="auto" />
    </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
