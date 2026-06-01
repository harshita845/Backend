// Vendor Controller Skeletons
const getDashboard = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Route working — full logic coming soon",
      data: null
    });
  } catch (error) {
    next(error);
  }
};

const getProducts = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Route working — full logic coming soon",
      data: null
    });
  } catch (error) {
    next(error);
  }
};

const getOrders = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Route working — full logic coming soon",
      data: null
    });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Route working — full logic coming soon",
      data: null
    });
  } catch (error) {
    next(error);
  }
};

const getEarnings = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Route working — full logic coming soon",
      data: null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getProducts,
  getOrders,
  getProfile,
  getEarnings,
};
