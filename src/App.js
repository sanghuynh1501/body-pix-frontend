import { useEffect, useState, useRef } from 'react'
import { Button, Input } from 'antd'
import axios from 'axios'
import moment from 'moment'
import Dropzone from 'react-dropzone'
import captureVideoFrame from "capture-video-frame"
import Resizer from 'react-image-file-resizer'
import person from './assets/person.jpg';
import './App.css';

const bodyPix = require('@tensorflow-models/body-pix');

function App() {

  const imageList = useRef([]);
  const imageUrlList = useRef([]);
  const [ imageURL, setImageURL ] = useState('')
  const [ videoURL, setVideoURL ] = useState('')
  const [ imageFile, setImageFlie ] = useState(null)
  const [ duration, setDuration ] = useState(0)
  const [ isVideoStop, setVideoStop] = useState(false)

  const resizeFile = (file, type) => new Promise(resolve => {
    Resizer.imageFileResizer(file, 500, 500, 'PNG', 100, 0,
    uri => {
      resolve(uri);
    },
    type
    );
  });

  const dataUrlToFile = async(dataUrl, fileName) => {

    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], fileName, { type: 'image/png' });
  }

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

  useEffect(() => {
    let video = document.getElementById('my-video');
    if (video) {
      video.playbackRate = 0.3
      video.play()
      let frame = null
      const interval = setInterval(() => {
        video = document.getElementById('my-video')
        if (!video.paused) {
          frame = captureVideoFrame("my-video", "png");
          imageList.current.push(frame.dataUri)
        } else {
          setVideoStop(true)
          clearInterval(interval)
        }
      }, 50)
    }
  }, [videoURL])

  useEffect(async () => {
    if(imageList.current.length > 0) {
      const net = await bodyPix.load({
        architecture: 'ResNet50',
        outputStride: 32,
        quantBytes: 4
      });
      let file = null
      let img
      let imageResizeBlob = null
      let count = 0
      const imageName = moment().format('DDMMYYYYHHmm')

      let j = 0
      let subArray = []
      let indexArray = []
      for (let i = 0; i < imageList.current.length; i += 20) {
        subArray = []
        for (j = i; j < i + 20; j ++) {
          subArray.push(j)
        }
        indexArray.push(subArray)
      }

      let formData = new FormData();
      let dataList = {name: imageName}

      for (let i = 0; i < indexArray.length; i++) {
        subArray = indexArray[i]
        formData = new FormData();
        dataList = {name: imageName}
        for (j = 0; j < subArray.length; j++) {
          if(imageList.current[subArray[j]] != 'data:,') {
            file = await dataUrlToFile(imageList.current[subArray[j]], imageName + '_' + count + '.png')
            imageResizeBlob = await resizeFile(file, 'blob')
            imageResizeBlob.name = imageName + '_' + count + '.png'
            formData.append("files", imageResizeBlob, imageName + '_' + count + '.png');
            img = document.getElementById("image");
            img.setAttribute("src", imageList.current[subArray[j]]);
            const segmentation = await net.segmentPerson(img, {
              flipHorizontal: false,
              internalResolution: 'full',
              segmentationThreshold: 0.7
            });
            dataList[count] = segmentation.data
            count += 1
          }
        }
        await axios({
          method: "POST",
          url: 'http://localhost:3000/tensorflow/uploadImages',
          data: formData,
          headers: {
            "Content-Type": "multipart/form-data"
          }
        })
        await axios.post('http://localhost:3000/tensorflow/uploadDatas', {
          data: dataList
        })
      }
     
    }
  }, [isVideoStop])

  return (
    <div className="App">
      <div className="container">
        <Input type="file" onChange={(e) => {
          if (e.target.files[0]) {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.src = URL.createObjectURL(e.target.files[0])
            video.onloadedmetadata = function() {
              window.URL.revokeObjectURL(video.src);
              setDuration(video.duration);
              const reader = new FileReader();
              reader.readAsDataURL(e.target.files[0]);
              reader.onload = function () {
                setVideoURL(reader.result);
              };
              reader.onerror = function (error) {
                console.log('Error: ', error);
              };
            }
          }
        }}/>
        {
          videoURL && (
            <video id="my-video" className="container_image" width="400px" height="400px" id="my-video">
              <source src={videoURL} type="video/mp4" />
            </video>
          )
        }
        <div className="container_image">
          <img id="image"/>
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
