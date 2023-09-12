const queue: any[] = [];

let isFlushPending = false;

const p = Promise.resolve();

export function nextTick(fn) {
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

function flushJobs() {
  let job;
  isFlushPending = false;
  while ((job = queue.shift())) {
    console.log("执行 job");

    job && job();
  }
}
