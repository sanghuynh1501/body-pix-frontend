import { useEffect, useState, useRef } from 'react'
import { Button, Input, Progress } from 'antd'
import axios from 'axios'
import moment from 'moment'
import captureVideoFrame from "capture-video-frame"
import Resizer from 'react-image-file-resizer'
import './App.css';

const bodyPix = require('@tensorflow-models/body-pix');

function App() {

  const imageList = useRef([]);
  const [ videoURL, setVideoURL ] = useState('')
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

  useEffect(() => {
    let video = document.getElementById('my-video');
    if (video) {
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
      }, 33)
    }
  }, [videoURL])

  useEffect(async () => {
    if(imageList.current.length > 0) {
      let startTime = moment().valueOf()
      console.log('startTime: ', startTime)
      const net = await bodyPix.load({
        architecture: 'ResNet50',
        outputStride: 32,
        quantBytes: 2
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
        console.log('i ', i)
        subArray = indexArray[i]
        formData = new FormData();
        dataList = {name: imageName}
        for (j = 0; j < subArray.length; j++) {
          if(imageList.current[subArray[j]] != 'data:,' && imageList.current[subArray[j]]) {
            file = await dataUrlToFile(imageList.current[subArray[j]], imageName + '_' + count + '.png')
            imageResizeBlob = await resizeFile(file, 'blob')
            imageResizeBlob.name = imageName + '_' + count + '.png'
            formData.append("files", imageResizeBlob, imageName + '_' + count + '.png');
            img = document.getElementById("image");
            img.setAttribute("src", imageList.current[subArray[j]]);
            const segmentation = await net.segmentPerson(img, {
              flipHorizontal: false,
              internalResolution: 'medium',
              segmentationThreshold: 0.7
            });
            dataList[count] = segmentation.data
            count += 1
          }
        }
        axios({
          method: "POST",
          url: 'http://localhost:3000/tensorflow/uploadImages',
          data: formData,
          headers: {
            "Content-Type": "multipart/form-data"
          }
        })
        axios.post('http://localhost:3000/tensorflow/uploadDatas', {
          data: dataList
        })
        console.log('sucess')
      }
      console.log('Time: ', (moment().valueOf() - startTime ) / 1000 + 's')
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
