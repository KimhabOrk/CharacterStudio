import React, { useState } from "react"
import styles from "./MergeOptions.module.css"
import MenuTitle from "../components/MenuTitle"
import Slider from "../components/Slider"
import { local } from "../library/store"
import { getAtlasSize } from "../library/utils"

function MergeOptions({showDropToDownload}) {

  
  const [atlasStd, setAtlasStd] = useState(local["mergeOptions_atlas_std_size"] || 6);
  const [atlasStdTransp, setAtlasStdTransp] = useState(local["mergeOptions_atlas_std_transp_size"] || 6);
  const [atlasMtoon, setAtlasMtoon] = useState(local["mergeOptions_atlas_mtoon_size"] || 6);
  const [atlasMtoonTransp, setAtlasMtoonTransp] = useState(local["mergeOptions_atlas_mtoon_transp_size"] || 6);
  const [downloadOnDrop, setDownloadOnDrop] = useState(local["mergeOptions_drop_download"] || false)
  const [currentOption, setCurrentOption] = useState(local["mergeOptions_sel_option"] || 0);
  const [options] = useState(["Merge to Standard", "Merge to MToon", "Keep Both"])

  const handleDropDownloadEnable = (event) => {
    setDownloadOnDrop(event.target.checked);
    local["mergeOptions_drop_download"] = event.target.checked;
  }

  const prevOption = () => {
    let cur = currentOption;
    if (currentOption <= 0)
      cur = options.length-1
    else
      cur -= 1

    setCurrentOption(cur);
    local["mergeOptions_sel_option"] = cur;
  }

  const nextOption = () => {
    let cur = currentOption;
    if (currentOption >= options.length - 1)
      cur = 0;
    else
      cur +=1;

    setCurrentOption(cur);
    local["mergeOptions_sel_option"] = cur;
  }

  const handleChangeAtlasSize = async (event, type) => {
    let val = parseInt(event.target.value);
    if (val > 8)
      val = 8;
    else if (val < 0)
      val = 0;

    const setAtlasSize = (size) => {
      switch (type){
        case 'standard opaque':
          // save to user prefs
          setAtlasStd(size);
          local["mergeOptions_atlas_std_size"]  = size;
          break;
        case 'standard transparent':
          setAtlasStdTransp(size);
          local["mergeOptions_atlas_std_transp_size"] = size;
          break;
        case 'mtoon opaque':
          setAtlasMtoon(size);
          local["mergeOptions_atlas_mtoon_size"] = size;
          break;
        case 'mtoon transparent':
          setAtlasMtoonTransp(size);
          local["mergeOptions_atlas_mtoon_transp_size"] = size;
          break;
      }
    }
    setAtlasSize(val) 
  }

  return (
    <div className={styles["InformationContainerPos"]}>
      <MenuTitle title="Optimizer Options" width={180} left={20}/>
      <div className={styles["scrollContainer"]}>

      <div className={styles["traitInfoTitle"]}>
            Merge Atlas Type
        </div>
        <br />
        <div className={styles["flexSelect"]}>
            <div 
                className={`${styles["arrow-button"]} ${styles["left-button"]}`}
                onClick={prevOption}
            ></div>
            <div className={styles["traitInfoText"]} style={{ marginBottom: '0' }}>{options[currentOption]}</div>
            <div 
            //`${styles.class1} ${styles.class2}`
                className={`${styles["arrow-button"]} ${styles["right-button"]}`}
                onClick={nextOption}
            ></div>
        </div>
        <br /><br /><br />

        {(currentOption === 0 || currentOption == 2)&&(
          <>
          <div className={styles["traitInfoTitle"]}>
              Standard Atlas Size
          </div>
          <br />
          <div className={styles["traitInfoText"]}>
              Opaque: {getAtlasSize(atlasStd) + " x " + getAtlasSize(atlasStd)}
          </div>

            <Slider value = {atlasStd} onChange={(value) => handleChangeAtlasSize(value, 'standard opaque')} min={1} max={8} step={1}/>
            <br/>
            <div className={styles["traitInfoText"]}>
              Transparent: {getAtlasSize(atlasStdTransp) + " x " + getAtlasSize(atlasStdTransp)}
          </div>
            <Slider value = {atlasStdTransp} onChange={(value) => handleChangeAtlasSize(value, 'standard transparent')} min={1} max={8} step={1}/>
            <br/> <br/> <br/>
          </>
        )}

        {(currentOption === 1 || currentOption == 2)&&(
          <>
          <div className={styles["traitInfoTitle"]}>
              MToon Atlas Size
          </div>
          <br />
        <div className={styles["traitInfoText"]}>
            Opaque: {getAtlasSize(atlasMtoon) + " x " + getAtlasSize(atlasMtoon)}
        </div>

          <Slider value = {atlasMtoon} onChange={(value) => handleChangeAtlasSize(value, 'mtoon opaque')} min={1} max={8} step={1}/>
          <br/>
          <div className={styles["traitInfoText"]}>
            Transparent: {getAtlasSize(atlasMtoonTransp) + " x " + getAtlasSize(atlasMtoonTransp)}
        </div>
          <Slider value = {atlasMtoonTransp} onChange={(value) => handleChangeAtlasSize(value, 'mtoon transparent')} min={1} max={8} step={1}/>
          <br/> <br/> <br/>
          </>
        )}
        {showDropToDownload && (
          <>
          <div className={styles["traitInfoTitle"]}>
              Drag Drop - Download
          </div>
          <div className={styles["traitInfoText"]}>
            <div className={styles["checkboxHolder"]}>
              <div>
                </div>
                
                <label className={styles["custom-checkbox"]}>
                    <input 
                        type="checkbox" 
                        checked={downloadOnDrop}
                        onChange={handleDropDownloadEnable}
                    />
                    <div className={styles["checkbox-container"]}></div>
                </label>
                <div/><div/>
                {downloadOnDrop ? "True": "False"}
              
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  )
}

export default MergeOptions