/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.cert('./thumball-digital.json')
});
const express = require('express');
const cookieParser = require('cookie-parser')();
const cors = require('cors')({origin: true});
const app = express();

app.use(
  express.urlencoded({
    extended: true
  })
)

app.use(express.json())

const db = admin.firestore();

// Express middleware that validates Firebase ID Tokens passed in the Authorization HTTP header.
// The Firebase ID token needs to be passed as a Bearer token in the Authorization HTTP header like this:
// `Authorization: Bearer <Firebase ID Token>`.
// when decoded successfully, the ID Token content will be added as `req.user`.
const validateFirebaseIdToken = async (req, res, next) => {
  functions.logger.log('Check if request is authorized with Firebase ID token');

  if ((!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) &&
      !(req.cookies && req.cookies.__session)) {
    functions.logger.error(
      'No Firebase ID token was passed as a Bearer token in the Authorization header.',
      'Make sure you authorize your request by providing the following HTTP header:',
      'Authorization: Bearer <Firebase ID Token>',
      'or by passing a "__session" cookie.'
    );
    res.status(403).send('Unauthorized');
    return;
  }

  let idToken;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    functions.logger.log('Found "Authorization" header');
    // Read the ID Token from the Authorization header.
    idToken = req.headers.authorization.split('Bearer ')[1];
  } else if(req.cookies) {
    functions.logger.log('Found "__session" cookie');
    // Read the ID Token from cookie.
    idToken = req.cookies.__session;
  } else {
    // No cookie
    res.status(403).send('Unauthorized');
    return;
  }

  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    functions.logger.log('ID Token correctly decoded', decodedIdToken);
    req.user = decodedIdToken;
    next();
    return;
  } catch (error) {
    functions.logger.error('Error while verifying Firebase ID token:', error);
    res.status(403).send('Unauthorized');
    return;
  }
};

app.use(cors);
app.use(cookieParser);
app.use(validateFirebaseIdToken);

app.get('/api/accounts/test1', async (req, res) => {
	// res.send("test")
	// return res.status(200).json({status: false, test:"test"});
	res.send(`Hello`);

});
app.get('/api/accounts/test', async (req, res) => {
  	// const { postId } = req.query;
  	try {  		
	  	let giftRef = db.collection(`partner`);
	  	let partners = [];
	  	let getCollection = giftRef.get()
		.then(snapshot => {
			// console.log("collection = ", snapshot);

			var aryResult = [];

			snapshot.forEach((doc) => {
				partners.push({ id: doc.id, ...doc.data() });
			});

			return res.status(200).json({status: true, data: partners});
		  })
		  .catch(error => {
			console.log('Error get /getPostWithId = ',  req.protocol + '://' + req.get('host') + req.originalUrl);
			return res.status(200).json({status: false, error: error.message});
		  })
  	}
  	catch(error) {
    	console.log('Error get /getPostWithId = ', req);
    	return res.status(200).json({status: false, error: error.message});
  	}
  	
	// return res.status(200).json({status: true, data: result[0]});

});
app.post('/api/accounts/updateAccount', async(req, res) => {
  const { uid, email, password } = req.body;
  const data = {};
  if(email) data['email'] = email;
  if(!!password) data['password'] = password;

  admin
  .auth()
  .updateUser(uid, data)
  .then((userRecord) => {
    // See the UserRecord reference doc for the contents of userRecord.
    console.log('Successfully updated user', userRecord.toJSON());
    return res.send({status: "success", updatedUser: userRecord.toJSON()})
  })
  .catch((error) => {
    console.log('Error updating user:', error);
    return res.status(404).send({status: 'failed', error: error});
  });
});
// This HTTPS endpoint can only be accessed by your Firebase Users.
// Requests need to be authorized by providing an `Authorization` HTTP header
// with value `Bearer <Firebase ID Token>`.
exports.widgets = functions.https.onRequest(app);

app.listen(3009, () => {
  console.log('Listening on part 3009...')
})