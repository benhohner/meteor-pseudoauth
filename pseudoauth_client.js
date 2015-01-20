Meteor.startup( function () {
    Session.setDefaultPersistent('authHash', '');
    Session.setDefaultPersistent('usernames', []);
    Session.setDefaultPersistent('currentUsername', '');
});

Pseudoauth.createOrAuthUsername = function (name, authHash) {
    Meteor.call('createOrAuthUsername', name, authHash, function(e, res, name) {
        if (res.success === true){
            Flash.add(status, message);
            if (! Session.get('authHash')) {
                Session.setPersistent('authHash', res.authHash);
            }
            var usernames = Session.get('usernames');
            if (usernames.indexOf(name) > -1) {
                usernames.push(name);
                Session.set('usernames', usernames);
            }
            return true;
        }
        if (e || res.success === false) {
            var message = e || res.message;
            var status = e || res.status;
            Flash.add(status, message);
        }
        return false;
    });
};

Pseudoauth.authUsername = function (name, authHash) {
    return Meteor.call('authUsername', name, authHash, function(e, res, name) {
        return false; //TODO add code here
    });
};

if (Package.blaze) {
    Package.blaze.Blaze.Template.registerHelper('authHash', function() {
       return Session.get('authHash'); 
    });
    
    Package.blaze.Blaze.Template.registerHelper('usernames', function() {
        return Session.get('usernames');
    });
    
    Package.blaze.Blaze.Template.registerHelper('currentUsername', function() {
        return Session.get('currentUsername');
    });
}
// before send message
// if not logged in
// createorauth user
// else
// send message with logged in user

// on load
// check for authHash
// every n seconds check localstorage for authHash

// get list of usernames for authHash