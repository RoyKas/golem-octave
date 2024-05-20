import { Proposal } from "@golem-sdk/golem-js";

export function getMyCost(proposal: Proposal, config): number {

  // Get number of threads
  const threads: number = proposal.properties["golem.inf.cpu.threads"];
  //console.log("Treads:", threads);

  // Estimate the total cost, assuming usage is proportional to no. threads
  const duration1: number = config.threads>0 ? config.duration*config.threads/threads : config.duration;   // first task
  //console.log("Duration1", duration1);
  const duration2 = 5;                                         // second task (5 second wait)
  const overheadDuration = 15;                                 // overhead at the provider
  const overheadCPU = 0.5;
  const duration = duration1 + duration2 + overheadDuration;
  const calculation1 = (1.0 * duration1 * threads);            // assuming work is always 100% cpu
  const calculation2 = (0.0 * duration2 * threads);
  const calculation = calculation1 + calculation2 + overheadCPU;
  const taskCost = proposal.pricing.start + (proposal.pricing.envSec*duration) + (proposal.pricing.cpuSec*calculation);

  return taskCost;
}

