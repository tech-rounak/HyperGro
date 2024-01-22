const axios = require('axios');
const fs = require('fs');
const fsPromise = require('fs/promises')
const decompress = require('decompress');
const dayjs = require('dayjs');
const Share = require('../models/share');
const readline = require("readline");
const path = require('path')

const download = async(dateString) => {
    const url = `https://www.bseindia.com/download/BhavCopy/Equity/EQ${dateString}_CSV.ZIP`
    return new Promise(async(resolve,reject)=>{
        await axios({method: 'get',url: url,responseType: 'stream'})
        .then(async(response)=>{
            response.data.pipe(fs.createWriteStream(`zipFile/EQ${dateString}.zip`));
            response.data.on("end",()=>{
                resolve(`zip EQ${dateString} file downloaded succesfully`)
                console.log(`zip EQ${dateString} file downloaded succesfully`);
            })
            response.data.on("error",()=>{
                reject(`Error while zipping data  EQ${dateString}`);
            })
        }).catch(error=>{
            console.log(error.message);
            reject(`error EQ${dateString} while zipping data`)
        })          
    })   
}

const processCSVFileAndSaveInDB = async(dateString,originalDate) => {
    return new Promise(async(resolve, reject) => {
        try{
            const path=`dist/EQ${dateString}.CSV`
            const readStream = fs.createReadStream(path);

            // Create a readline interface
            const readInterface = readline.createInterface({
                input: readStream
            });

            const output = [];
            readInterface.on("line", (line) => {
                const row = line.split(",");
                output.push(row);
            });

            readInterface.on("close", async() => {
                console.log(`--------------------- CSV File parsing completed for EQ-${dateString}-------------------`);
                var jsonArray = []
                for(let i = 1 ; i < output.length ; i++){
                    var obj = {};
                    for(let j = 0 ; j < output[i].length ; j++){
                        obj[output[0][j]]=output[i][j].trim();
                    }
                    obj["date"] = originalDate.slice(0,10);
                    obj["SHARE_ID"]=`${originalDate.slice(0,10)}_${obj["SC_CODE"]}`;
                    jsonArray.push(obj);
                }
                await saveDataToDB(jsonArray).then(()=>resolve()).catch((err)=>reject(err))
            });

            readInterface.on("error", (err) => {
                // console.error("Error reading the CSV file:", err);
                throw Error("Error reading the CSV file");
            });
        }
        catch(error){
            // console.log("error::",error?.message)
            reject(error?.message);
        }
    })
   
}
const saveDataToDB = async(shareData) => { 
    return new Promise(async(resolve, reject) => { 
        try{
            const found = await Share.findOne({date:shareData[0].date});
            if(found){
                throw Error(`------------------ Data Already Exists  for date ${shareData[0].date}} --------------`);
            }
            const formatted = shareData.map(val=>({
                insertOne:{
                    document:{
                        ...val
                    }
                }
            }))
            await Share.bulkWrite(formatted,{ordered:false})
            console.log(`------------- Share Data Saved Successfully for date ${shareData[0].date}} --------------`)
            resolve()
        }
        catch(error){
            reject(error.message)
        }
    })
    
}
const unzipData = async(fileName) => {
    return new Promise(async(resolve,reject)=>{
        await decompress(`zipFile/EQ${fileName}.zip`, 'dist').then(files => {
            console.log(`EQ${fileName} zipFile Extracted`);
            resolve(`EQ${fileName} zipFile Extracted`);
        }).catch(error=>{
            console.log("error",error);
            reject(`Error while unizipping EQ${fileName}`);
        });
    })
}

const fetchHistoricData = async(days)=> {
    const currentDate = dayjs();
    const last51BusinessDays = [];
    let daysCounter = 1;
    while (last51BusinessDays.length < days) {
        const currentDay = currentDate.subtract(daysCounter, 'day');
        // Check if the current day is not a weekend (Saturday or Sunday)
        if (currentDay.day() !== 6 && currentDay.day() !== 0) {
          last51BusinessDays.push(currentDay);
        }
        daysCounter++;
    }

    const formattedDates = await Promise.all(
        last51BusinessDays.map(async (date) => {
            const found = await Share.findOne({ date: date.format('YYYY-MM-DD') });
            if (!found) {
                return {
                    dateString: date.format('DDMMYY'),
                    original: date.toISOString(),
                };
            } else {
                console.log(`------------------ Data Already Exists  for date ${date} --------------`);
                return null;
            }
        })
    );
    return formattedDates.filter((date) => date !== null);
}



const fetchBSEData = async(days = 50) =>{
    const historicData = await fetchHistoricData(days);
    const downloadPromises = historicData.map(async (data) => {
        try {
            await download(data.dateString);
            await unzipData(data.dateString);
            await processCSVFileAndSaveInDB(data.dateString, data.original);
        } catch (error) {
            console.log(error);
        }
    });

    await Promise.all(downloadPromises);

    cleanUp("./zipFile")
    cleanUp("./dist")
    

}
const cleanUp = async(dirPath) => {
    try {
      console.log(`------------- Cleanup for files under ${dirPath} directory -------------`)
      const files = await fsPromise.readdir(dirPath);
      const deleteFilePromises = files.map(file =>
        fsPromise.unlink(path.join(dirPath, file)),
      );
      await Promise.all(deleteFilePromises);
    } catch (err) {
      console.log(err);
    }
  }

 
module.exports = {fetchBSEData}