import { useState } from 'react'
import { Button } from 'antd'
import axios from 'axios'
import Dropzone from 'react-dropzone'
import Resizer from 'react-image-file-resizer'
import person from './assets/person.jpg';
import './App.css';

const bodyPix = require('@tensorflow-models/body-pix');

function App() {

  const [ imageURL, setImageURL ] = useState('')
  const [ imageFile, setImageFlie ] = useState(null)

  const resizeFile = (file, type) => new Promise(resolve => {
    Resizer.imageFileResizer(file, 500, 500, 'JPEG', 100, 0,
    uri => {
      resolve(uri);
    },
    type
    );
  });

  const process = async () => {
    const img = document.getElementById("image");
    const net = await bodyPix.load({
      architecture: 'ResNet50',
      outputStride: 32,
      quantBytes: 4
    });
    const segmentation = await net.segmentPerson(img, {
      flipHorizontal: false,
      internalResolution: 'full',
      segmentationThreshold: 0.7
    });
    console.log(segmentation);

    var formData = new FormData();
    const imageResize = await resizeFile(imageFile, 'blob')
    formData.append("file", imageResize);
    axios.post('http://localhost:3000/tensorflow/uploadImage', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }).then(function (response) {
      if (response.data == 'success') {
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
    })
  }

  return (
    <div className="App">
      <div className="container">
        <Dropzone onDrop={async acceptedFiles => {
            const reader = new FileReader();
            const file = acceptedFiles[0];
            const url = await resizeFile(file, 'base64')
            setImageFlie(file)
            setImageURL(url)
          }}>
            {({getRootProps, getInputProps}) => (
              <section>
                <div {...getRootProps()}>
                  <input {...getInputProps()} />
                  <p>Drag 'n' drop some files here, or click to select files</p>
                </div>
              </section>
            )}
        </Dropzone>
        {
          imageURL && (
            <div className="container_image">
              <img id="image" src={imageURL}/>
            </div>
          )
        }
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
