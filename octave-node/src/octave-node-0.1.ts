import { AgreementSelectors, ProposalFilterFactory, MarketHelpers, Proposal } from "@golem-sdk/golem-js";
import { GolemError } from "@golem-sdk/golem-js";
import { TaskExecutor } from "@golem-sdk/task-executor";
import { ReputationSystem } from "@golem-sdk/golem-js/experimental";
import { Command, InvalidArgumentError } from "commander";
import { readFileSync, writeFileSync } from "fs";

import { getMyCost } from "./my-cost";
import { delay, removeEmptyLines, logList, round } from "./utils";
import { Requestor, RequestorConfig } from "./requestor";


// ---- defaults ----


const config: RequestorConfig = {
  tasksPerLoop: 1,
  command: 'octave --version',
  duration: 120.0,
  threads: 1,
  limits: {
    start: 1.000,
    cpuPerSec: 0.001,
    envPerSec: 0.001,
    estimate: 0.0001,
  },
  executor: {
    payment: { network: "polygon" },
    maxParallelTasks: 1,
//    package: "52e3037e835bb7f70577fa505a930b78661b9433c72c62ee0d0ca722",     // Octave image (Ubuntu)
    package: "24bab3823c46aeef0bd9991fdb13abc43152ffda3b32f3c2455abc8b",     // Octave image (debian)
    minCpuCores: 1,
    minMemGib: 1,
    minStorageGib: 1,
    minCpuThreads: 1,
//    capabilities: ["vpn"],
//    networkIp: "192.168.0.0/24",
    yagnaOptions: { apiKey: "svr01_r11_appkey" },
    startupTimeout: 60_000,                        // time to wait for first agreement
    taskTimeout: 300_000,                          // time to wait for task, default 300s
    budget: 10,
    exitOnNoProposals: true,
  }
}

let nodeNames: string[] = [];
var parallelTasks: number;
var tasksPerLoop: number;
var onlyBlacklist = false;
var outputFile;


// ---- Signals ----


let signal: boolean = false;

function gracefulShutdown() {
  console.log('Shutting down gracefully...');

  signal = true;

  // Force close the server after 30 seconds
  setTimeout(() => {
    console.error('Could not shutdown gracefully in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);


// ---- Start of Main ----


async function main(config: RequestorConfig, options, name: string) {

  // Options, we only run one set of tasks in parallel in one loop
  parallelTasks = options.tasks;
  tasksPerLoop = options.tasks;
  console.log("Running", tasksPerLoop, "tasks per loop.");
  config.limits.estimate = options.limit;
  console.log("Limiting estimated cost to", config.limits.estimate);

  // Construct requestor class
  let requestor: Requestor = new Requestor(config, tasksPerLoop);

  if (options.blacklist) {
    onlyBlacklist = options.blacklist;
    console.log("Providers are blacklisted, running", onlyBlacklist, "tasks.");
  }
  if (options.output) {
    outputFile = options.output;
    console.log("Write output to file:", outputFile);
  }
  if (options.file) {
    // read the node names from file
    nodeNames = readFileSync(name).toString().split("\n");      
    // remove empty entries (due to empty lines in source file)
    removeEmptyLines(nodeNames);
    console.log("Found file with", nodeNames.length, "provider names.");
  } else {
    nodeNames.push(name);
    console.log("Found provider name:", nodeNames[0]);
  }

  // Initialize the whitelist or blacklist
  let tasks: number;
  if ( onlyBlacklist==false ) {
    requestor.addNodesWhiteList(nodeNames);
    tasks = requestor.lengthWhiteList();
  } else {
    requestor.addNodesBlackList(nodeNames);
    tasks = onlyBlacklist;
  }

  // repeat as long as there are still tasks left
  do {
    // run the main task
    await requestor.taskLoop(tasks);

    // update and check remaining work
    tasks = onlyBlacklist==false ? requestor.lengthWhiteList() : tasks-tasksPerLoop;
    console.log("Now", requestor.lengthBlackList(), "nodes blacklisted.");

    if ( tasks>0 ) {
      console.log("Still", tasks, "tasks to do.");

      // wait 5 seconds
      console.log("More nodes to check, waiting 5 seconds...");
      await delay(5000);
    }

  } while ( !signal && tasks>0 );

  // remove dupicates
  const uniqBlackListNames = [...new Set(requestor.blackListNames)];

  // Summary on the console
  if (onlyBlacklist == false) {
    console.log("Planned work on", nodeNames.length, "nodes:");
    console.log("Not completed:", requestor.lengthWhiteList() );
    console.log("Failed       :", requestor.failedNames.length);
    console.log("Results      :", requestor.collectedResults.length);
    for (let loop = 0; loop < requestor.lengthWhiteList(); loop++) {
      console.log("Missed node  :", requestor.whiteListNames[loop])
    }
  } else {
    console.log("Initially blacklisted:", nodeNames.length);
    console.log("Tasks to run         :", onlyBlacklist);
    console.log("Failed               :", requestor.failedNames.length);
    console.log("Checked              :", uniqBlackListNames.length-nodeNames.length);
    console.log("Results              :", requestor.collectedResults.length);
  }
  for (let loop = 0; loop < requestor.failedNames.length; loop++) {
    console.log("Failed node  :", requestor.failedNames[loop])
  }
  let sum = 0;
  let sumsq = 0;
  let max = -1000000000;
  let min = 1000000000;
  let count = requestor.collectedResults.length;
  for (let loop = 0; loop < count; loop++) {
    let score = requestor.collectedResults[loop].score;
    sum += score;
    max = score > max ? score : max;
    min = score < min ? score : min;
  }
  let average = sum/count;
  console.log("Average score:", average);
  console.log("Maximum score:", max);
  console.log("Minimum score:", min);
  console.log("Cummulative score:", sum);
  for (let loop = 0; loop < count; loop++) {
    let score = requestor.collectedResults[loop].score;
    sumsq += (score-average)*(score-average);
  }
  let variance = sumsq/count;
  let stddev = Math.sqrt(variance);
  console.log("Std deviation:", stddev);

//  function round(value, precision) {
//    var multiplier = Math.pow(10, precision || 0);
//    return Math.round(value * multiplier) / multiplier;
//  }

  // process data
/*
  for (let loop = 0; loop < requestor.collectedResults.length; loop++) {
    if ( requestor.collectedResults[loop].result.stdout.substr(0, 9) == "stress-ng" ) {
      const benchResults = {}

      const regExString = new RegExp(`(?<=hogs:).*?(?=matrix)`, "igs");
      benchResults.threads = +regExString.exec( requestor.collectedResults[loop].result.stdout )[0];

      const subset = requestor.collectedResults[loop].result.stdout.slice(-70);
      const ops = +subset.substr(0, 11);
      const time = +subset.substr(11, 10);
      const user = +subset.substr(21, 10);
      const sys = +subset.substr(31, 10);

      benchResults.ops = round(ops,0);
      benchResults.usage = round(user+sys,1);
      benchResults.equivThreads = round(benchResults.usage/time,1);
      benchResults.opsPerThread = round(benchResults.ops/benchResults.equivThreads,1);

      requestor.collectedResults[loop].result.benchResults = benchResults;
    }
  }
*/

  // write all results to file (option)
  if( outputFile ) {
    var json = JSON.stringify( requestor.collectedResults );
    writeFileSync(outputFile, json, err => {
      if (err) {
        console.error(err);
      } else {
        // file written successfully
      }
    });
  } else {
    // show all results
    for (let loop = 0; loop < requestor.collectedResults.length; loop++) {
      console.log(requestor.collectedResults[loop]);
    }
  }

  // force shutdown if SIGINT/SIGTERM
  if (signal) {
    process.exit(0);
  }
}


// ---- End of Main ----


function parseMyInt(value: string): bigInt {
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) {
    throw new InvalidArgumentError('Not a number.');
  }
  return parsedValue;
}


// ---- Process arguments ----


const program = new Command();
program
  .name('check-node')
  .description('Check Golem node and run benchmark.')
  .version('0.0.1')
  .argument('<string>', 'name, or file with names, to check.')
  .option('-f, --file', 'using file with node names to check')
  .option('-t, --tasks <number>', 'number of tasks to run in parallel', parseMyInt, config.tasksPerLoop)
  .option('-o, --output <string>', 'write results to file')
  .option('-b, --blacklist <number>', 'blacklist instead of whitelist node(s), and run number of tasks', parseMyInt)
  .option('-l, --limit <number>', 'limit estimated cost', parseFloat, config.limits.estimate)
  .option('-d, --duration', 'duration of the task', parseFloat, config.duration);
program.parse();
const options = program.opts();
if (program.args.length>1) {
  console.warn("Found more than 1 argument, using the first one only.");
}
main(config, options, program.args[0]);
