const AccessSchema = require("../Schemas/AccessSchema");

const RateLimiter = async (req, res, next) => {
  const sessionId = req.session.id;
  const sessionDb = await AccessSchema.findOne({sessionId: sessionId});
  if(!sessionDb){
    const sessionObj=new AccessSchema({
        sessionId: sessionId,
        time: Date.now()
    })
    await sessionObj.save();
    next();
    return;
  }
  const prevAccessTime = sessionDb.time;
  const currTime=Date.now();
  if(currTime-prevAccessTime<500){
    return res.send({
        status: 401,
        message: "Too many requests. Please try again after some time!"
    })
  }
  try{
    await AccessSchema.findOneAndUpdate({sessionId:sessionId},{time:Date.now()})
    next();
  }catch(error){
    return res.send({
        status: 500,
        message: "Database Error",
        error: error
    })
  }
};

module.exports = { RateLimiter };
