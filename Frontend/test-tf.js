// Test TensorFlow.js imports
console.log('Testing TensorFlow.js imports...');

try {
  const tf = require('@tensorflow/tfjs');
  require('@tensorflow/tfjs-react-native');
  
  console.log('✅ TensorFlow.js packages imported successfully');
  console.log('TensorFlow.js version:', tf.version_core);
  
  // Test basic tensor creation
  const tensor = tf.tensor([1, 2, 3, 4]);
  console.log('✅ Basic tensor creation works');
  console.log('Tensor shape:', tensor.shape);
  
  tensor.dispose();
  console.log('✅ All tests passed');
  
} catch (error) {
  console.error('❌ TensorFlow.js test failed:', error.message);
  process.exit(1);
}