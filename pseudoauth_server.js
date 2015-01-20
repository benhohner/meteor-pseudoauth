var crypto = Npm.require('crypto');

PSEUDOAUTH_USERNAME_EXPIRE_TIME = 49 * 86400; // 49 days in seconds
var AUTHENTICATION_SECRET = '_a3ra98xna?Aafs#(@3hNfa9nsd9ya9wh3ka5nsD<AE?>';
var PUBLIC_SECRET = '27b9b234J@(A#Bh9aw!_fnxz,.cxvnjdsjJFEJ1`sdkjsd?';

/*
 *
 * COLLECTIONS
 *
 */
/*
// User (few)
{
  token:'jf9sj3iHahiR89fhh89HN',
  authHash: 'A2978B8D76A7D97A97A9d090AB0014D45E0890891FA2978B8D76A7D97A97A9d090AB0014D45E0890891F', // hash(token + identifierSecret)
  publicHash: 'DEF72B8D76A7D97A97A9d090AB0014D45E0890891FA2978B8D76A7D97A97A9d090AB0014D45E0890891F', // hash(token + publicSecret)
  created: '2014/04/21 13:35-0000',
  last_seen: '2014/04/21 13:35-0000'
}

// Pseudonym (typically one, possibly tens per user)
{
  type: 'pseudonym',
  name: 'malufox',
  identifierHash: 'A2978B8D76A7D97A97A9d090AB0014D45E0890891FA2978B8D76A7D97A97A9d090AB0014D45E0890891F', // hash(token + identifierSecret)
  publicHash: 'DEF72B8D76A7D97A97A9d090AB0014D45E0890891FA2978B8D76A7D97A97A9d090AB0014D45E0890891F', // hash(token + publicSecret)
  created: '2014/04/21 13:35-0000',
  last_seen: '2014/04/21 13:35-0000'
}

// Anonynym (only one per user)
{
  type: 'anonymous',
  identifierHash: 'A2978B8D76A7D97A97A9d090AB0014D45E0890891FA2978B8D76A7D97A97A9d090AB0014D45E0890891F', // hash(token + identifierSecret)
  publicHash: 'DEF72B8D76A7D97A97A9d090AB0014D45E0890891FA2978B8D76A7D97A97A9d090AB0014D45E0890891F', // hash(token + publicSecret)
  created: '2014/04/21 13:35-0000',
  last_seen: '2014/04/21 13:35-0000'
}
*/

Pseudoauth.user = new Mongo.Collection("pseudousers");
Pseudoauth.username = new Mongo.Collection("pseudonyms");

/*
 *
 * INDEXES
 *
 */
Meteor.startup(function(){
  Pseudoauth.user._ensureIndex({authHash: 1}, {background: true});
  Pseudoauth.user._ensureIndex({publicHash: 1}, {background: true});
  Pseudoauth.username._ensureIndex({name: 1}, {sparse: true, unique: true, background: true});
  Pseudoauth.username._ensureIndex({authHash: 1}, {background: true});
  Pseudoauth.username._ensureIndex({publicHash: 1}, {background: true});
});

/*
 * usernames must be unique
 * usernames are registered under a user
 *   - the point of this is to allow each username to share the same authhash and publichash
 * usernames expire afer Username Expire Time
 * pseudonyms are authenticated by passing a username and an authHash to the server
 * anonymyms are authenticated by passing only an authHash to the server 
 * authHashes and usernames are stored locally
 * a user logs in by passing their authHash and username to the server
 * 
 * // Internal message
 * {
 *   success: false,
 *   authHash: 'H439aVNAs9h59hasHAhsg94JSena', // optional
 *   status: 'error',
 *   message: 'Message to pass to client.'
 * }
 */

Meteor.methods({
  createOrAuthUsername: function(name, authHash) {
    if (name) {
      var username = Pseudoauth.getUsername(name);
      if (username) {
        // if the username isn't expired
        if ((new Date() - username.last_seen) < PSEUDOAUTH_USERNAME_EXPIRE_TIME) {
          if (! authHash) {
            return {success: false, authHash: '', status: 'error', message: 'Authentication Failed. You should stop hacking and come work with us!'};
          }
          
          if (username.authHash === authHash) {
            return {success: true, authHash: username.authHash, status: 'success', message: 'Authenticated Successfully.'};
          } else {
            return {success: false, authHash: '', status: 'error', message: 'Authentication Failed. Username is registered by another user.'};
          }
        } else { // if the username is expired
          if (! authHash) {
            var new_user = Pseudoauth.createAndGetUser();
            
            // update expired username with new user's authHash and publicHash
            Pseudoauth.username.update(
              {'_id': username._id},
              {
                authHash: new_user.authHash,
                publicHash: new_user.publicHash,
                created: new Date(), // reset created date
                last_seen: new Date() // reset last seen date
              }
            );
            
            return {success: true, authHash: new_user.authHash, status: 'success', message: 'Username registered successfully.'};
          }
          
          if (username.authHash === authHash) {
            // renew username
            Pseudoauth.username.update({'_id': username._id}, {last_seen: new Date()});
            
            return {success: true, authHash: username.authHash, status: 'success', message: 'Authenticated Successfully.'};
          } else { // if username authHash and provided authHash do not match
            // get current user with authHash
            var current_user = Pseudoauth.user.findOne({authHash: username.authHash});
            
            // update expired username with current user's hashes
            Pseudoauth.username.update(
              {'_id': username._id},
              {
                authHash: current_user.authHash,
                publicHash: current_user.publicHash,
                created: new Date(), // reset created date
                last_seen: new Date() // reset last seen date
              }
            );
            
            return {success: true, authHash: username.authHash, status: 'success', message: 'Username registered successfully.'};
          }
        }
      } else { // username doesn't exist
        if (! authHash) {
          var new_user = Pseudoauth.createAndGetUser();
          var new_username = Pseudoauth.createAndGetPseudoUsername(name, new_user.authHash, new_user.publicHash);
          
          return {success: true, authHash: new_user.authHash, status: 'success', message: 'Username registered successfully.'};
        } else {
          var current_user = Pseudoauth.user.findOne({'authHash': authHash});
          if (! current_user) {
            return {success: false, authHash: null, status: 'error', message: 'Authentication Failed. You should stop hacking and come work with us!'};
          }
          var new_username = Pseudoauth.createAndGetPseudoUsername(name, current_user.authHash, current_user.publicHash);
          
          return {success: true, authHash: new_username.authHash, status: 'success', message: 'Username registered successfully.'};
        }
      }
    } else { // if no name
      if (authHash) {
        if (Pseudoauth.username.findOne({type: 'anonymous', 'authHash': authHash})) {
          return {success: true, 'authHash': authHash, status: 'success', message: 'Authenticated Successfully.'};
        } else {
          return {success: false, authHash: null, status: 'error', message: 'Authentication Failed. You should stop hacking and come work with us!'};
        }
        
      } else {
        var new_user = Pseudoauth.createAndGetUser();
        var new_username = Pseudoauth.createAndGetAnonUsername(new_user.authHash, new_user.publicHash);
        
        console.log("new user created: user:" + new_username.authHash + " p:" + new_username.publicHash);
        return {success: true, authHash: new_username.authHash, status: 'success', message: 'Authenticated successfully.'};
      }
    }
  },
  authUsername: function(name, authHash) {
    if (! authHash) {
      return {success: false, status: 'error', message: 'Authentication hash required. You should come work with us!'};
    }
    if (name) {
      var username = Pseudoauth.getUsername(name);
      if (username) {
        // if the username isn't expired
        if ((new Date() - username.last_seen) < PSEUDOAUTH_USERNAME_EXPIRE_TIME) {
          if (username.authHash === authHash) {
            return {success: true, status: 'success', message: 'Authenticated successfully.'};
          } else {
            return {success: false, status: 'error', message: 'Username reserved by someone else.'};
          }
        } else { // if the username is expired
          return {success: false, status: 'error', message: 'Username expired. Please reregister.'};
        }
      } else { // username doesn't exist
        return {success: false, status: 'error', message: 'Not authorized. You should come work with us!'};
      }
    } else { // if no name
      if (Pseudoauth.username.findOne({type: 'anonymous', 'authHash': authHash})) {
        return {success: true, status: 'success', message: 'Authenticated successfully.'};
      } else { // anonymous username doesn't exist
        return {success: false, status: 'error', message: 'Not authorized. You should come work with us!'};
      }
    }
  }
});

/*
 * Returns a Username based on a name
 */
Pseudoauth.getUsername = function (name) {
  return Pseudoauth.username.findOne({'name': name});
}

/*
 * Creates and returns a new user
 */
Pseudoauth.createAndGetUser = function () {
  var token = generateToken();
  var userId = Pseudoauth.user.insert({
    'token': token,
    'authHash': generateTokenHash(token, AUTHENTICATION_SECRET),
    'publicHash': generateTokenHash(token, PUBLIC_SECRET),
    created: new Date(),
    last_seen: new Date()
  });
  return Pseudoauth.user.findOne({_id: userId});
}

/*
 * Creates and returns a new pseudonymous user
 */
Pseudoauth.createAndGetPseudoUsername = function (name, authHash, publicHash) {
  var usernameId = Pseudoauth.username.insert({
    type: 'pseudonym',
    'name': name,
    'authHash': authHash,
    'publicHash': publicHash,
    created: new Date(),
    last_seen: new Date()
  });
  return Pseudoauth.username.findOne({_id: usernameId});
}

/*
 * Creates and returns a new anonymous user
 */
Pseudoauth.createAndGetAnonUsername = function (authHash, publicHash) {
  var usernameId = Pseudoauth.username.insert({
    type: 'anonymous',
    'authHash': authHash,
    'publicHash': publicHash,
    created: new Date(),
    last_seen: new Date()
  });
  return Pseudoauth.username.findOne({_id: usernameId});
}

/*
 * Generate a pseudorandom user token.
 */
var generateToken = function () {
  var buf = crypto.pseudoRandomBytes(48);
  return buf.toString('hex');
}

/*
 * Create a secure hash of a token and a secret.
 */
var generateTokenHash = function (token, secret) {
  var hmac = crypto.createHmac('sha256', secret);
  hmac.update(token);
  return hmac.digest('base64');
}


