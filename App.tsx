import { StatusBar } from 'expo-status-bar';
import { Button, StyleSheet, Text, View } from 'react-native';
import { InferenceSession } from 'onnxruntime-react-native';
import { useState } from 'react';

export default function App() {
  const [encoder, setEncoder] = useState<InferenceSession>();
  const [decoder, setDecoder] = useState<InferenceSession>();

  const loadModels = async () => {
    const e = await InferenceSession.create('./models/encoder.onnx');
    const d = await InferenceSession.create('./models/decoder.onnx');
    setEncoder(e);
    setDecoder(d);
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
