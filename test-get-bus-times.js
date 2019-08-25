/*jshint esversion: 6 */
const https = require('https');
const querystring = require('querystring');

// local imports
const priData = require('./pri-settings');
const SESSIONID_URL = priData.SESSIONID_URL;
const BUSDATA_URL = priData.BUSDATA_URL;
const BUS_STOP_NAMES = priData.BUS_STOP_NAMES;



/* constants */


/* global variables */
var globalCompletedReqs = 0;
var globalBusStopReqData = {}; // key : bus stop names




/*
 * Construct POST req params
 */
function constructPOSTData(stopName){
  var pdatastr = querystring.stringify({
      'Mode' : '10',
      'StopName': stopName,
      'Lang': 'En'
  });
  return pdatastr;
}

function constructPOSTOptions(sessionID){
  var poptsstr = {
    hostname: 'ebus.tycg.gov.tw',
    path: '/NewTaoyuan/API/BusXMLLine_close.aspx',
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        //'Content-Length': Buffer.byteLength(postData),
        'Cookie': `Language=en_us; ASP.NET_SessionId=${sessionID}; googtrans=/en/en`,
    }
  };
  return poptsstr;
}



function createBusStopReq(sessionID, stopName) {

  // construct POST data
  var postData = constructPOSTData(stopName);

  // construct POST options
  var postOptions = constructPOSTOptions(sessionID);

  //console.log(postOptions);
  //console.log(postData);

  // Set up the request
  var postReq = https.request(postOptions, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          //console.log('Response: ' + chunk);
          globalBusStopReqData[stopName] = chunk;
          globalCompletedReqs++;

          // the end - we report
          if (globalCompletedReqs == BUS_STOP_NAMES.length){
            //console.log(globalBusStopReqData);
            _printBusStopData(globalBusStopReqData);



          }
      });


  });

  postReq.on('error', error => {
    console.error(error);
  });

  // post the data
  postReq.write(postData);
  postReq.end();

}


function run(){

  resetGlobals();

  // step 1) get session id
  https.get(SESSIONID_URL, function(response) {
      cookieData = response.headers['set-cookie'];
      //console.log(cookieData);

      var regex = /SessionId=(.*?);/;
      var sessionID = regex.exec(cookieData)[1];
      console.log(sessionID);

      // send off one request for each bus stop
      for (var i = 0; i < BUS_STOP_NAMES.length; i++) {
        createBusStopReq(sessionID, BUS_STOP_NAMES[i]);
      }


  }).on("error", (err) => {
    console.log("Error: " + err.message);
  });
}

/*
 * Format Responses
 */
function _printBusStopData(allRespData){
  var dataByBusKey = {};
  Object.keys(allRespData).forEach(function(key) {
      var val = allRespData[key];
      var filtData = val.split("|")[1];
      if (filtData !== ""){
          filtData = filtData.split("@");
          for (var i = 0; i < filtData.length; i++){

            //console.log(filtData[i]);


            // add to dict
            var record = filtData[i].split(',');
            //console.log(record);
            bus = record[1];
            route = record[2];
            time = record[3];


            if (bus !== ""){
              if (bus in dataByBusKey){
                dataByBusKey[bus].push(time);
              }else{
                dataByBusKey[bus] = [time];
              }
            }
          }



      }else{
        console.log("Error:: " + key + "=> NO DATA" );
      }
    });

    console.log(dataByBusKey);
}






/*
 * Helpers
 */
function resetGlobals(){
  globalCompletedReqs = 0;
  globalBusStopReqData = {};
}


/*
 * Main
 */
run();
