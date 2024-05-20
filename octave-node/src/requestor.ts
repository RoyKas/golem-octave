import { Proposal, AgreementSelectors, ProposalFilterFactory } from "@golem-sdk/golem-js";
import { TaskExecutor } from "@golem-sdk/task-executor";
import { GolemError } from "@golem-sdk/golem-js";
import { logList } from "./utils";
import { getMyCost } from "./my-cost";
import { pinoPrettyLogger } from "@golem-sdk/pino-logger";
//import { ReputationSystem } from "@golem-sdk/golem-js/experimental";


// ---- types ----


type RequestorConfig = {
  tasksPerLoop: number;
  command: string;
  duration: number;
  threads: number;
  limits: {
    start: number;
    cpuPerSec: number;
    envPerSec: number;
    estimate: number;
  };
  executor: {
    payment: { network: string };
    maxParallelTasks: number;
    package: string;
    logger?: Logger;
    proposalFilter?: () => boolean;
    agreementSelector?: any;         // check what actual type is...
    minCpuCores: number;
    minMemGib: number;
    minStorageGib: number;
    minCpuThreads: number;
    capabilities?: string[];
    networkIp?: string;
    yagnaOptions: { apiKey: string };
    startupTimeout: number;
    taskTimeout: number;
    maxTaskRetries: number;
    budget: number;
    exitOnNoProposals: boolean;
  };
};


// ---- Class ----


export class Requestor {

  config: RequestorConfig;
  tasksPerLoop: number;
  //onlyBlacklist: boolean;
  whiteListUsed: boolean;
  proposals;

  scores;
  whiteListNames: string[];
  whiteList = () => boolean;
  blackListNames: string[];
  blackList = () => boolean;
  failedNames: string[];
  limitFilter = () => boolean;
  collectedResults = [];

  constructor( config: RequestorConfig, tasks: number ) {
    this.config = config;
    this.tasksPerLoop = tasks;
    this.whiteListUsed = false;
    //this.onlyBlacklist = true;  // white list is empty by default, unless names are added to whitelist only the blacklist is used

    this.proposals = {};
    this.scores = {};
    this.whiteListNames = [];
    this.whiteList = ProposalFilterFactory.allowProvidersByName(this.whiteListNames);
    this.blackListNames = [];
    this.blackList = ProposalFilterFactory.disallowProvidersByName(this.blackListNames);
    this.failedNames = [];
    this.limitFilter = ProposalFilterFactory.limitPriceFilter(this.config.limits);
    this.collectedResults = [];

    this.config.executor.logger = pinoPrettyLogger({level: "info",});
    //this.config.executor.proposalFilter = this.myFilter;
    //    proposalFilter: reputation.proposalFilter(),
    //this.config.executor.agreementSelector = AgreementSelectors.bestAgreementSelector(this.scores);
  }

  addNodesWhiteList( nodes: string[] ) {
    this.whiteListNames.push.apply(this.whiteListNames, nodes);
    //this.onlyBlacklist = false;
    this.whiteListUsed = true;
    console.log("Will accept only proposals from:");
    logList('', this.whiteListNames);    
  }

  addNodesBlackList( nodes: string[] ) {
    this.blackListNames.push.apply(this.blackListNames, nodes);
    if (nodes.length>1) {
      console.log("Will not accept proposals from:");
      logList('', this.blackListNames);    
    }
  }

  removeNodeWhiteList( node: string ) {
    const index = this.whiteListNames.indexOf( node );
    if (index > -1) {
      console.log("Removing", node, "from whitelist.");
      this.whiteListNames.splice(index, 1);
    }
  }

  removeNodeBlackList( node: string ) {
    const index = this.blackListNames.indexOf( node );
    if (index > -1) {
      console.log("Removing", node, "from blacklist.");
      this.blackListNames.splice(index, 1);
    }   
  }

  lengthWhiteList() {
    return this.whiteListNames.length;
  }

  lengthBlackList() {
    return this.blackListNames.length;
  }

  scoreProvider(proposal: Proposal, taskCost: number) {
    const nodeID: string = proposal.provider.id;
    this.scores[ nodeID ] = 1.0-1.0/(1.0+taskCost);
    //console.log( proposal.provider.name, "score:", this.scores[ nodeID ] );
  }

  handleError( err, item = 0 ) {
    if (err instanceof GolemError) {
      console.warn("Golem error (",item ,"):", err.message);
      let providerName = (err.provider)&&("name" in err.provider) ? err.provider.name : false;
      if (providerName) {
        console.log("Provider node", providerName, "caused error, blacklisting...");
        this.addNodesBlackList( providerName.split(",") );
        if (this.whiteListUsed) {
          this.removeNodeWhiteList( providerName );
          console.log("Provider node", providerName, "removed from whitelist...");
        }
        this.failedNames.push( providerName );
      }
    } else {
      console.error("A generic error happened:", err);
    }
  }


  myFilter: boolean = (proposal: Proposal) => {
    // Get the providers node name
    const nodeName: string = proposal.provider.name;
    const nodeID: string = proposal.provider.id;
    //console.log("Got proposal from:", nodeName, ":", nodeID);

    if (this.whiteListUsed) {
      if (!this.whiteList(proposal)) return false;
    }

    // Blacklist
    if (!this.blackList(proposal)) return false;

    // Pricing limits
    if (!this.limitFilter(proposal)) return false;

    // Calculate cost
    const taskCost: number = getMyCost(proposal, this.config);
    //console.log( nodeName, "task cost estimated at:", taskCost, "." );

    // Reject if exceeding price limit
    if (taskCost>this.config.limits['estimate']) {
      //console.log( nodeName, "estimate (", taskCost ,") exceeding limit (", this.config.limits['estimate'] ,")." );
      return false;
    }

    // Calculate the score for the provider (0-1), low score is selected first
    this.scoreProvider(proposal, taskCost);

    // Store provider data for later
    let proposalData = {}
    proposalData.wallet = proposal.provider.wallet;
    proposalData.vector = proposal.properties['golem.com.usage.vector'];
    proposalData.pricing = proposal.properties["golem.com.pricing.model.linear.coeffs"];
    this.proposals[ nodeID ] = proposalData;

    return true; // provider node is accepted
  }


  async taskLoop( maxTasks: number ) {

    // Start timer
    //console.time("taskLoop");

    // Get data from reputation system
    //  const reputation = await ReputationSystem.create({
    //    paymentNetwork: "polygon",
    //  });
    //  console.log("Listed providers", reputation.getData().providers.length);
    //  reputation.setProposalWeights({
    //    uptime: 0.7,
    //    successRate: 0.3,
    //  });

    // prepare taskexecutor
    this.config.executor['maxParallelTasks'] = this.tasksPerLoop;
    this.config.executor.proposalFilter = this.myFilter;
    //    proposalFilter: reputation.proposalFilter(),
    this.config.executor.agreementSelector = AgreementSelectors.bestAgreementSelector(this.scores);
    this.config.executor.maxTaskRetries = 0;

    //console.log("Starting executor with config=", this.config.executor );
    const executor: TaskExecutor = await TaskExecutor.create( this.config.executor );

    // prepare data
    const data: number[] = [];
    const tasks: number = this.tasksPerLoop < maxTasks ? this.tasksPerLoop : maxTasks;
    console.log("Initiating", tasks, "tasks...");
    for (let i = 1; i <= tasks; i++) {
      data.push(i);
    }

    // run the task(s)
    try {
      const futureResults = data.map(async (item) => {
        //console.log("Starting task (", item, ")...");

        return await executor.run(async (ctx) => {

            //console.timeLog("taskLoop", ctx.provider.name, "running task (", item, ")...");

            const result = await ctx
              .beginBatch()
              .run( this.config.command )
              .run("sleep 5s")  // just an example to show how to run multiple commands in a batch
              .end();
            if (!result) {
              console.log("Task (", item, ") ended without providing result.");
              return;
            }

            if (this.whiteListUsed) {
              // remove the node from the whitelist to prevent checking the same node again
              this.removeNodeWhiteList( ctx.provider.name );
            } else {
              // add the node to the blacklist to prevent checking the same node again
              this.addNodesBlackList( [ ctx.provider.name ] );
            }
  
            // store the results for later use
            this.collectedResults.push( {
              name: ctx.provider.name,
              id: ctx.provider.id,
              score: this.scores[ ctx.provider.id ],
              result: result[0],
              proposal: this.proposals[ ctx.provider.id ]
            } );

            //console.timeLog("taskLoop", ctx.provider.name, "finished task (", item, ")" );

            return result;

        }).catch( (err) => {
          this.handleError(err, item);
        }); //catch

      }); //map

      // wait for all jobs to finish
      const results = await Promise.all(futureResults);
    } catch (err) {
      this.handleError(err);
    } finally {
      //console.timeLog("taskLoop", "Shutting down task executor...");
      await executor.shutdown();
    }
    //console.timeEnd("taskLoop");
    console.log("Completed task loop.");
  }


}


// ---- End of Class ----



