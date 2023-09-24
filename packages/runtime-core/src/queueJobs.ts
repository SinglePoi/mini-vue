const queue: any[] = [];
const activePreFlushCbsL: any[] = [];

let isFlushPending = false;

const p = Promise.resolve();

export function nextTick(fn?) {
  return fn ? p.then(fn) : p;
}

export function queueJobs(job) {
  if (!queue.includes(job)) {
    queue.push(job);
  }

  queueFlush();
}

function queueFlush() {
  // 任务队列中的 job 对应的微任务应该只有一个
  if (isFlushPending) return;
  isFlushPending = true;

  nextTick(flushJobs);
}

export function queuePreFlushCb(job) {
  activePreFlushCbsL.push(job);
  queueFlush();
}

function flushJobs() {
  let job;
  isFlushPending = false;

  flushPreFlushCbs();

  while ((job = queue.shift())) {
    console.log("执行 job");

    job && job();
  }
}

function flushPreFlushCbs() {
  for (let i = 0; i < activePreFlushCbsL.length; i++) {
    activePreFlushCbsL[i]();
  }
}
