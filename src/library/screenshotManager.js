import * as THREE from "three"
import { Buffer } from "buffer";

const screenshotSize = 4096;

const localVector = new THREE.Vector3();

export class ScreenshotManager {
  constructor(characterManager) {
    this.renderer = new THREE.WebGLRenderer({
      preserveDrawingBuffer: true,
      antialias: true
    });
    this.characterManager = characterManager;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.setSize(screenshotSize, screenshotSize);
    this.camera = new THREE.PerspectiveCamera( 30, 1, 0.1, 1000 );
    this.textureLoader = new THREE.TextureLoader();
    this.sceneBackground = new THREE.Color(0.1,0.1,0.1);
    this.frameOffset = {
      min:0.2,
      max:0.2,
    }

    this.boneOffsets = {
      head:null,
      chest:null,
      hips:null,
      leftUpperLeg:null,
      leftFoot:null,
      rightUpperLeg:null,
      rightFoot:null,
    }
  }

  setupCamera(cameraPosition, lookAtPosition, fieldOfView = 30){
    this.camera.position.copy(cameraPosition);
    this.camera.lookAt(lookAtPosition)
    this.camera.fov = fieldOfView;
    console.log("camera has been set");
  }

  _getCharacterMinMax(){
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    this.characterManager.characterModel.traverse((o) => {
      if (o.geometry) {
        o.geometry.computeBoundingBox();
        
        // If boundingBox is available
        if (o.geometry.boundingBox) {
            o.geometry.boundingBox.applyMatrix4(o.matrixWorld);

            if (o.geometry.boundingBox.min.y < minY)
              minY = o.geometry.boundingBox.min.y

            if (o.geometry.boundingBox.max.y > maxY)
              maxY = o.geometry.boundingBox.max.y
        }
      }
    });
    return {minY, maxY}
  }

  frameCloseupShot(){
    this.frameShot("head", "head")
  }
  frameMediumShot(){
    this.frameShot("chest", "head")
  }
  frameCowboyShot(){
    this.frameShot("hips", "head")
  }
  frameFullShot(){
    this.frameShot("leftFoot", "head")
  }


  frameShot(minBoneName, maxBoneName, cameraPosition = null, minGetsMaxVertex = false, maxGetsMaxVertex = true){
    const min = this._getBoneWorldPositionWithOffset(minBoneName, minGetsMaxVertex);
    const max = this._getBoneWorldPositionWithOffset(maxBoneName, maxGetsMaxVertex);
    
    min.y -= this.frameOffset.max;
    max.y += this.frameOffset.min;

    cameraPosition = cameraPosition || new THREE.Vector3(0,0,0)
    
    this.positionCameraBetweenPoints(min,max,cameraPosition)
  }


  _setBonesOffset(minWeight){
    for (const boneName in this.boneOffsets) {
      console.log(boneName)
      const result = this._getMinMaxOffsetByBone(this.characterManager.characterModel, boneName, minWeight);
      
      // Store the result in the boneOffsets property
      this.boneOffsets[boneName] = result;
    }
    console.log(this.boneOffsets);
  }

  _getBoneWorldPositionWithOffset(boneName, getMax) {
    const bone = this._getFirstBoneWithName(boneName);

    if (!bone || !this.boneOffsets[boneName]) {
        return new THREE.Vector3();
    }
    const boneWorldPosition = new THREE.Vector3();
    bone.getWorldPosition(boneWorldPosition);
    const offset = getMax ? this.boneOffsets[boneName].max : this.boneOffsets[boneName].min;
    boneWorldPosition.y += offset.y;
    return boneWorldPosition;
  }

  _getBoneWorldPosition(boneName){
    const bone = this._getFirstBoneWithName(boneName);
    if (bone != null){
      return new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
    }
    else{
      console.warn(`Bone with name '${boneName}' not found in one of the skinned meshes.`);
      return new THREE.Vector3(0,0,0);
    }
  }

  _getFirstBoneWithName(boneName) {
    let resultBone = null;

    this.characterManager.characterModel.traverse(child => {
        if (child instanceof THREE.SkinnedMesh) {
            if (!child.geometry) {
                console.error("Invalid skinned mesh found in children.");
                return;
            }

            const boneIndex = child.skeleton.bones.findIndex(bone => bone.name === boneName);

            if (boneIndex !== -1) {
                resultBone = child.skeleton.bones[boneIndex];
                // Break out of the loop since we found the bone
                return;
            }
        }
    });
    return resultBone;
  }

  _getMinMaxOffsetByBone(parent, boneName, minWeight) {
    // Ensure parent is valid
    if (!parent || !parent.traverse) {
        console.error("Invalid parent object provided.");
        return null;
    }

    // TODO: Ensure the character is in T pose;


    // Initialize min and max offset vectors
    const minOffset = new THREE.Vector3(Infinity, Infinity, Infinity);
    const maxOffset = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

    // Traverse all children of the parent
    parent.traverse(async (child) => {
        if (child instanceof THREE.SkinnedMesh) {
          const curPos = this._saveBonesPos(child.skeleton);
          const delay = ms => new Promise(res => setTimeout(res, ms));

          child.skeleton.pose();
          await delay(10);
          
          // Ensure each skinnedMesh has geometry
          if (!child.geometry) {
              console.error("Invalid skinned mesh found in children.");
              return;
          }

          // Find the index of the bone by name
          const boneIndex = child.skeleton.bones.findIndex(bone => bone.name === boneName);

          // Check if the bone with the given name exists
          if (boneIndex === -1) {
              console.error(`Bone with name '${boneName}' not found in one of the skinned meshes.`);
              return;
          }
          
          const positionAttribute = child.geometry.getAttribute("position");
          const skinWeightAttribute = child.geometry.getAttribute("skinWeight");
          const skinIndexAttribute = child.geometry.getAttribute("skinIndex");

          // Iterate through each vertex
          for (let i = 0; i < positionAttribute.count; i++) {
            const worldVertex = new THREE.Vector3().fromBufferAttribute(positionAttribute, i).applyMatrix4(child.matrixWorld);
        
            // Check the influence of the bone on the vertex
            const skinIndex = skinIndexAttribute.getX(i);

            if (skinIndex === boneIndex) {
              // Get the weight of the bone influence
              const influence = skinWeightAttribute.getX(i);
      
              // If the influence is above the minimum weight
              if (influence >= minWeight) {
                  // Calculate offset from the bone's position difference
                  const bone = child.skeleton.bones[boneIndex];
                  const bonePosition = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
                  const offset = worldVertex.clone().sub(bonePosition);
      
                  // Update min and max offset vectors
                  minOffset.min(offset);
                  maxOffset.max(offset);
              }
            }
          }
          this._restoreSavedPose(curPos, child.skeleton);
        }
    });
    //topOffset bottomOffset
    return { min: minOffset, max: maxOffset };
  }

  _saveBonesPos(skeleton){

      let savedPose = [];
      skeleton.bones.forEach(bone => {
          savedPose.push({
              position: bone.position.clone(),
              rotation: bone.rotation.clone(),
              scale: bone.scale.clone()
          });
      });
      return savedPose;
  }

  _restoreSavedPose(savedPose, skeleton) {
    if (savedPose) {
        skeleton.bones.forEach((bone, index) => {
            bone.position.copy(savedPose[index].position);
            bone.rotation.copy(savedPose[index].rotation);
            bone.scale.copy(savedPose[index].scale);
        });
    }
  }



  positionCameraBetweenPoints(vector1, vector2,cameraPosition, fieldOfView = 30) {
    // const{minY,maxY} = this._getCharacterMinMax();
    // vector1.y = minY;
    // vector2.y = maxY;
    this.characterManager.characterModel.traverse((o)=>{
      if (o.isMesh){
        
        //console.log(o.geometry.boundingBox);
      }
    })
    const boundingBox = new THREE.Box3();
    boundingBox.expandByPoint(vector1);
    boundingBox.expandByPoint(vector2);

    this.camera.fov = fieldOfView;

    const verticalFOV = this.camera.fov * (Math.PI / 180); 

    const diagonalDistance = boundingBox.getSize(new THREE.Vector3()).length();

    const distance = diagonalDistance / (2 * Math.tan(verticalFOV / 2));

    boundingBox.getCenter(localVector)
    // Set the camera's position and lookAt
    this.camera.position.copy(localVector);

    cameraPosition.y *= 0.5; 

    this.camera.lookAt(localVector.clone().sub(cameraPosition)); // adjust lookAt position if needed

    // Adjust the camera position based on the calculated distance
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    this.camera.position.addScaledVector(direction, -distance);

    // Update the camera's projection matrix to ensure proper rendering
    this.camera.updateProjectionMatrix();
  }

  setCamera(headPosition, playerCameraDistance,fieldOfView = 30) {
    this.camera.position.copy(headPosition);
    this.camera.fov = fieldOfView;
    localVector.set(0, 0, -1);
    this.cameraDir = localVector.applyQuaternion(this.camera.quaternion);
    this.cameraDir.normalize();
    this.camera.position.x -= this.cameraDir.x * playerCameraDistance;
    this.camera.position.z -= this.cameraDir.z * playerCameraDistance;

  }

  /**
   * Sets the background using either color or image.
   * 
   * @param {Array|string} background - If an array, assumed to be RGB values [r, g, b].
   *                                    If a string, assumed to be a URL for the background image.
   */
  setBackground(background){
    if (Array.isArray(background)){
      this.setBackgroundColor(background[0],background[1],background[2])
    }
    else{
      this.setBackgroundImage(background);
    }
  }

  setBackgroundColor(r,g,b){
    this.sceneBackground = new THREE.Color(r,g,b);
  }

  setBackgroundImage(url){
    return new Promise(async (resolve, reject) => {
      try{
        const backgroundTexture = await this.texureLoader.load(url);
        if (backgroundTexture){
          backgroundTexture.wrapS = backgroundTexture.wrapT = THREE.RepeatWrapping;
          this.sceneBackground = backgroundTexture;
          resolve();
        }
      }
      catch(error){
        console.error("Error loading background image: ", error)
        reject(error)
      }
    });
  }

  saveAsImage(imageName) {
    let imgData;
    try {
      this.scene.background = this.sceneBackground;
      this.renderer.render(this.scene, this.camera);
      const strDownloadMime = "image/octet-stream";
      const strMime = "image/png";
      imgData = this.renderer.domElement.toDataURL(strMime);

      const base64Data = Buffer.from(
        imgData.replace(/^data:image\/\w+;base64,/, ""),
        "base64"
      );
      const blob = new Blob([base64Data], { type: "image/jpeg" });
      
      this.saveFile(imgData.replace(strMime, strDownloadMime), imageName);
      this.scene.background = null;
      return blob;
    } catch (e) {
      console.log(e);
      return false;
    }

  }

  _createImage(width, height){
    const aspectRatio = width / height;
    this.renderer.setSize(width, height);
    this.camera.aspect = aspectRatio;
    this.camera.updateProjectionMatrix();
    try {
      this.scene.background = this.sceneBackground;
      this.renderer.render(this.scene, this.camera);
      const strMime = "image/png";
      let imgData = this.renderer.domElement.toDataURL(strMime);
      this.scene.background = null;
      return  imgData
    } catch (e) {
      console.log(e);
      return null;
    }
  }
  saveScreenshot(imageName,width, height){
    const imgData =  this._createImage(width, height)
    const strDownloadMime = "image/octet-stream";
    const strMime = "image/png";
    this.saveFile(imgData.replace(strMime, strDownloadMime), imageName + ".png");
  }

  getScreenshotImage(width, height){
    const imgData = this._createImage(width, height);
    const img = new Image();
    img.src = imgData;
    return img;
  }
  getScreenshotTexture(width, height){
    const img = this.getScreenshotImage(width,height)
    const texture = new THREE.Texture(img);
    texture.needsUpdate = true;
    return texture;
  }
  getScreenshotBlob(width, height){
    const imgData = this._createImage(width, height)
    const base64Data = Buffer.from(
      imgData.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );
    const blob = new Blob([base64Data], { type: "image/jpeg" }); 
    return blob; 
  }
  saveFile (strData, filename) {
    const link = document.createElement('a');
    if (typeof link.download === 'string') {
      document.body.appendChild(link); //Firefox requires the link to be in the body
      link.download = filename;
      link.href = strData;
      link.click();
      document.body.removeChild(link); //remove the link when done
    } else {
      const win = window.open(strData, "_blank");
      win.document.write("<title>" + filename + "</title><img src='" + strData + "'/>");
    }
  }

}