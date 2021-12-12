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

const defaultTransientErrorHandler = (_error) => true 

const shouldHalt = ({
    retries,
    isTransientError = defaultTransientErrorHandler
}, attempt, error) =>
  attempt >= retries || !isTransientError(error)

const invokeAction = (config, action, args, attempt) =>
  action(...args)
    .catch(error =>
      shouldHalt(config, attempt, error)
        ? Promise.reject(error)
            : delay(calculateBackoff(config, attempt))
                .then(() => invokeAction(config, action, args, attempt + 1))
    )

    // Decorator
const retry = (
  config,
  action
) => (...args) =>
  invokeAction(config, action, args, 0)

const maybeWillWork = retry(
    {
        retries: 5,
        maxDelay: 1000,
        minDelay: 100,
        factor: 2,
        jitter: true,
        isTransientError: (error) => ['ETIMEDOUT', 'ECONNREFUSED'].includes(error.code)
    },
  failWhen(.5)
)

console.log('Starting')
maybeWillWork()
  .then(console.log)
  .catch(console.error)