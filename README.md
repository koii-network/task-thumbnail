# task-template
Template to create, test, and deploy tasks

## Components

- `bin` Scripts to test and deploy tasks
- `contract` Source code for smart contract
- `executable` Source code for executable
- `tests` Scripts to test task

## Scripts

- `build` Build the smartcontract
- `test` Runs all tests, or a secific test
- `deploy`
- `deployExecutable`
- `deployInitJson`
- `deployContract`

## Testing

Install dependencies using `yarn install`

Setup your `.env` using `cp .env.example .env`

Test with jest `yarn build && yarn test`

or

Test with node `yarn build && node test`

## Todo

- Change SDK rate limit so it can run at an accelerated time frame for testing purposes
