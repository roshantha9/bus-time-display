/*jshint esversion: 6 */
/******************************************************************
 * time functions
 ******************************************************************/


// get details on current date/time
function findCurrentTime(){
  var twTimeOffset = 8; // lambda gives UTC time, so we reduce 8 hours (to get to Taiwan time)
  var d = new Date(new Date().setHours(new Date().getHours()+twTimeOffset));

  // construct date string
  var date = ("0" + d.getDate()).slice(-2);
  var month = ("0" + (d.getMonth() + 1)).slice(-2);
  var year = d.getFullYear();
  var hours = d.getHours();
  var minutes = (d.getMinutes()<10?'0':'') + d.getMinutes();
  var seconds = (d.getSeconds()<10?'0':'') + d.getSeconds();

  // date & time in YYYY-MM-DD HH:MM:SS format
  var format_str = year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;

  // unix timestamp
  var format_unix = Math.floor(d/1000);

  result = {
    'year' : year,
    'month' : month,
    'date' : date,
    'hours' : hours,
    'minutes' : minutes,
    'seconds' : seconds,
    'formatStr' : format_str,
    'formatUnix' : format_unix
  };

  console.log(result);
  return result;
}


function _timeStrToObj(s){
  let d = new Date();
  let [hours,minutes] = s.split(':');

  d.setHours(+hours); // set the hours, using implicit type coercion
  d.setMinutes(minutes); // you can pass Number or String, it doesn't really matter

  return d;
}

// we want to only log time when the bus service is active
// i.e. between 6am - 10pm
function isNowActiveTime(h, m){
  hh = parseInt(h);
  if ((hh > 6) && (hh < 22)){
    return true;
  }else{
    return false;
  }
}


function isTimeWithinRange(targetTimeStr, nowObj, rangeMin){

  if (targetTimeStr.includes(":") === true){
    var targetObj = _timeStrToObj(targetTimeStr);

    var minsDiff = (targetObj.getMinutes() - nowObj.getMinutes()) + ((targetObj.getHours() - nowObj.getUTCHours())*60);

    //console.log(targetObj.getHours() + ":" + targetObj.getMinutes() + " - " + nowObj.getUTCHours() + ":" + nowObj.getMinutes() +  " = " + minsDiff);

    if ((minsDiff <= rangeMin) && (minsDiff > 0)){
      return true;
    }else{
      return false;
    }

  }else{
    return false; // invalid time string
  }
}

// string format e.g. "5min"
function getMinsFromString(strMins){
  var mins=0;
  try {
    mins = parseInt(strMins.replace("min", ""));
    return mins;
  }
  catch(err) {
    return mins;
  }
}



function sortTimeListAscending(nowObj, tArr){

  var i;
  var arrMins = [];

  for (i = 0; i < tArr.length; i++){

    var t = tArr[i];

    if (t.includes("min")){
      arrMins.push(parseInt(t.replace("min")));

    }else if(t.includes(":")){

      tObj = _timeStrToObj(t);
      var diffMins = ((tObj.getHours() - nowObj.getUTCHours()) * 60) + (tObj.getMinutes() - nowObj.getUTCMinutes());
      arrMins.push(diffMins);
    }else{ // unknown format
      // pass
    }
  }

  // sort list
  arrMins.sort((a, b) => a - b);

  // add units
  var result = [];
  for (i = 0; i < arrMins.length; i++){
    result[i] = arrMins[i].toString()+"min";
  }

  return result;

}




function removeSimilar(busTimes){
  /*
  var busTimesClone1 = [...busTimes];
  var busTimesClone2 = [...busTimes];
  var i,j, minDiff;

  for (i = 0; i < busTimesClone1.length; i++){
    t1 = busTimesClone[i];

    if (t1.includes("min")) { // "min format"
      for (j = 0; j < busTimesClone1.length; j++){
        t2 = busTimesClone1[i];

        if (t2.includes("min")){
          t1num = parseInt(t1.replace("min"));
          t2num = parseInt(t2.replace("min"));
          minDiff = Math.abs(t1num - t2num);

          if (i !== j){
            if ((t1_num == t2_num) || (minDiff<5)){
              if (busTimesClone1[i]>busTimesClone1[j]){
                busTimesClone2.splice(j,1);
              }else{
                busTimesClone2.splice(i,1);
              }
            }
          }
        }else{
          // pass
        }


      }


    }else{ // ":" format

      t1Obj = _timeStrToObj(t1);

      for (j = 0; j < busTimesClone1.length; j++){
        t2 = busTimesClone1[j];

        if (t2.includes(":")){
            t2Obj = _timeStrToObj(t2);

            if (i!==j){
              minDiff = Math.abs(t1Obj - t2Obj)
              ;
              if (t1Obj) (minDiff < 5)

            }



        }else{
          // pass
        }

      }



    }

  }


  for(let t of busTimes) {

  }

*/
}



module.exports = {
  findCurrentTime,
  isNowActiveTime,
  isTimeWithinRange,
  getMinsFromString,
  sortTimeListAscending
};
