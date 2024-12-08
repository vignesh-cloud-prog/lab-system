const provisionLab = require('../utils/provisionLab');

exports.provisionLab = async (req, res, next) => {
  try {
    const { cpu, ram, setupScript } = req.body;

    // Ensure CPU and RAM values are provided
    if (!cpu || !ram) {
      return res.status(400).json({ error: 'CPU and RAM are required' });
    }

    const instance = await provisionLab.provisionEcsLab(cpu, ram, setupScript);
    res.status(200).json({ message: 'Lab provisioned', instance });
  } catch (err) {
    next(err); // Pass to error handling middleware
  }
};
