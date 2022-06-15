const Photo = require('../models/photo.model');
const Voter = require('../models/Voter.model');
const sanitize = require('mongo-sanitize');
const requestIp = require('request-ip');

/****** SUBMIT PHOTO ********/

exports.add = async (req, res) => {

  try {
    const { title, author, email } = req.fields;
    const file = req.files.file;

    if (title && author && email && file) { // if fields are not empty...

      const clearTitle = title.replace(/(<([^>]+)>)/gi, ''); // remove html tags from text
      const clearAuthor = author.replace(/(<([^>]+)>)/gi, '');// remove html tags from text

      const mailFormat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; //checking e-mail format
      
      if (!email.match(mailFormat)){
        throw new Error('Invalid e-mail address');
      }

      const fileName = file.path.split('/').slice(-1)[0]; // cut only filename from full path, e.g. C:/test/abc.jpg -> abc.jpg
      const fileExt = fileName.split('.').slice(-1)[0];
      
      if (fileExt === 'gif' || fileExt === 'jpg' || fileExt === 'png'){
        const newPhoto = new Photo({
          title: sanitize(clearTitle) ,
          author: sanitize(clearAuthor),
          email: sanitize(email),
          src: fileName,
          votes: 0
        });
        await newPhoto.save(); // ...save new photo in DB
        res.json(newPhoto);
      } else {
        throw new Error('File is not image!');
      }
      
    } else {
      throw new Error('Wrong input!');
    }

  } catch(err) {
    res.status(500).json(err);
  }

};

/****** LOAD ALL PHOTOS ********/

exports.loadAll = async (req, res) => {

  try {
    res.json(await Photo.find());
  } catch(err) {
    res.status(500).json(err);
  }

};

/****** VOTE FOR PHOTO ********/

exports.vote = async (req, res) => {

  try {
    const userIp = requestIp.getClientIp(req);
    const user = await Voter.findOne({ user: userIp });
    const photoToUpdate = await Photo.findOne({ _id: req.params.id });

    if (!user){

      const newVoter = new Voter({
        user: userIp,
        votes: [photoToUpdate._id.toString()] 
      
      })
      
      await newVoter.save();
      photoToUpdate.votes++;
      await photoToUpdate.save();
      res.send({ message: 'OK' });

    } else {

      const photo = photoToUpdate._id.toString();
      const checkPhoto = user.votes.indexOf(photo);
      
      if (checkPhoto < 0){
        user.votes.push(photo);
        await user.save();
        photoToUpdate.votes++;
        await photoToUpdate.save();
        res.send({ message: 'ok' })
      } else {
        res.status(500).json({ message: 'You have voted on this picture' });
      }

    }

  } catch(err) {
    res.status(500).json(err);
  }

};
