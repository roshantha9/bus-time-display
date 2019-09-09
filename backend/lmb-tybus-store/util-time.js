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


function isTimeWithinRange(){
  return false;
}


module.exports = {
  findCurrentTime,
  isNowActiveTime,
  isTimeWithinRange
};
