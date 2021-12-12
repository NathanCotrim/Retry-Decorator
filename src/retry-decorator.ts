type PromiseError = any;

type Action = (...args: any[]) => Promise<any>;

type Retry<T extends Action> = (...args: Parameters<T>) => ReturnType<T>;

type TransientErrorDetector = (error: PromiseError) => boolean;

type RetryConfig = Readonly<{
	retries: number;
	minDelay: number;
	maxDelay: number;
	factor: number;
	jitter: boolean;
	isTransientError: TransientErrorDetector;
}>;

type ErrorParams = { code: string; message: string };

const createError = ({ code, message }: ErrorParams): Error => {
	const error = new Error(message);
	Object.assign(error, { code });
	return error;
};

const failWhen = (percent: number) => (): Promise<string> => {
	console.log(`I have a ${percent * 100}% chance to fail`);

	return Math.random() < percent
		? Promise.reject(createError({ code: 'ETIMEDOUT', message: 'Timed out' }))
		: Promise.resolve('It worked!');
};

const delay = (time: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, time));

const randomBetween = (min: number, max: number): number =>
	Math.floor(Math.random() * (max - min + 1) + min);

const addJitter = (backoff: number): number => randomBetween(0, backoff);

const calculateBackoff = (
	{ minDelay, maxDelay, factor, jitter }: RetryConfig,
	attempt: number
): number => {
	const attemptBackoff = minDelay * factor ** attempt;
	const backoff = Math.min(attemptBackoff, maxDelay);
	const jittered = jitter ? addJitter(backoff) : backoff;
	console.log('backoff', jittered);
	return jittered;
};

const defaultTransientErrorDetector: TransientErrorDetector = (
	_error: PromiseError
) => true;

const shouldHalt = (
	{ retries, isTransientError = defaultTransientErrorDetector }: RetryConfig,
	attempt: number,
	error: PromiseError
): boolean => !isTransientError(error) || attempt >= retries;

const invokeAction = (
	config: RetryConfig,
	action: Action,
	args: Parameters<Action>,
	attempt: number
): ReturnType<Action> =>
	action(...args).catch((error) =>
		shouldHalt(config, attempt, error)
			? Promise.reject(error)
			: delay(calculateBackoff(config, attempt)).then(() =>
					invokeAction(config, action, args, attempt + 1)
			  )
	);

export const retry =
	<T extends Action>(config: RetryConfig, action: T): Retry<T> =>
	(...args: Parameters<T>): ReturnType<T> =>
		invokeAction(config, action, args, 0) as ReturnType<T>;

const maybeWillWork = retry(
	{
		retries: 5,
		minDelay: 1000,
		maxDelay: 5000,
		factor: 2,
		jitter: true,
		isTransientError: (error) => error?.code === 'ETIMEDOUT',
	},
	failWhen(0.3)
);

maybeWillWork().then(console.log).catch(console.error);
