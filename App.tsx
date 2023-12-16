import { StatusBar } from 'expo-status-bar';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';
import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import { useState } from 'react';
import { Asset } from 'expo-asset';

export default function App() {
  const [encoder, setEncoder] = useState<InferenceSession>();
  const [decoder, setDecoder] = useState<InferenceSession>();

  const loadModels = async () => {
    const assets = await Asset.loadAsync([require('./models/encoder.onnx'), require('./models/decoder.onnx')]);
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

  return (
    <View style={styles.container}>
      <Text>Open up App.tsx to start working on your app!</Text>
      <Text>Encoder: {encoder ? 'loaded' : 'not loaded'}</Text>
      <Text>Decoder: {decoder ? 'loaded' : 'not loaded'}</Text>
      <Button title="Load models" onPress={loadModels} />
      <StatusBar style="auto" />
    </View>
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
