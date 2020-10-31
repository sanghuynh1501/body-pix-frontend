import { Button } from 'antd'
import axios from 'axios'
import person from './assets/person.jpg';
import './App.css';

const bodyPix = require('@tensorflow-models/body-pix');

function App() {

  const process = async () => {
    const img = document.getElementById("image");
    const net = await bodyPix.load({
      architecture: 'ResNet50',
      outputStride: 32,
      quantBytes: 2
    });
    const segmentation = await net.segmentPerson(img);
    console.log(segmentation);

    axios.post('http://localhost:3000/tensorflow/uploadData', {
      data: segmentation.data
    })
    .then(function (response) {
      console.log(response);
    })
    .catch(function (error) {
      console.log(error);
    });

  }

  return (
    <div className="App">
      <div className="container">
        <div className="container_image">
          <img id="image" src={person}/>
        </div>
        <Button type="primary" onClick={() => {
          process()
        }}>
          Process
        </Button>
      </div>
    </div>
  );
}

export default App;
