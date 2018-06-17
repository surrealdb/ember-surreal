// The name of the localStorage
// key used to store the current
// authentication token.

export const key = 'surreal';

// The name of the localStorage
// key used to store the unique
// session connection id.

export const sid = 'session';

// The endpoint of the Surreal
// database server, for both
// REST and Socket requests.

export const uri = 'https://surreal.io';

// We also export all of the
// variables as default so that
// they can be imported at once.

export default { sid, key, uri };
