// Retry Decorator Implementation =============================================
const { failWhen } = require('./helpers')

const delay = time =>
    new Promise(resolve =>
        setTimeout(resolve, time)
    )

const randomBetween = (min, max) => 
    Math.floor(Math.random() * (max - min + 1) + min)


const addJitter = backoff => randomBetween(0, backoff)  
    
const calculateBackoff = ({
    minDelay,
    maxDelay,
    factor,
    jitter
}, attempt) => {
    const attemptBackoff = minDelay * factor ** attempt
    const backoff = Math.min(attemptBackoff, maxDelay)
    const jitteredBackoff = jitter ? addJitter(backoff) : backoff

    console.log('backoff', jitteredBackoff);
    return jitteredBackoff
}

const shouldHalt = (retries, attempt) =>
  attempt >= retries

const invokeAction = (config, action, args, attempt) =>
  action(...args)
    .catch(err =>
      shouldHalt(config.retries, attempt)
        ? Promise.reject(err)
            : delay(calculateBackoff(config, attempt))
                .then(() => invokeAction(config, action, args, attempt + 1))
    )

    // Decorator
const retry = (
  config,
  action
) => (...args) =>
  invokeAction(config, action, args, 0)


// Executing ==================================================================
const maybeWillWork = retry(
    {
        retries: 5,
        maxDelay: 1000,
        minDelay: 100,
        factor: 2,
        jitter: true
    },
  failWhen(.5)
)

console.log('Starting')
maybeWillWork()
  .then(console.log)
  .catch(console.error)