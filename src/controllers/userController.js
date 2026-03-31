import User from "../models/User.js";
import Address from "../models/Address.js";

/* --- GET PROFILE --- */
export const getProfile = async (req, res) => {
  try {
    // Include all new personal and location fields
    const user = await User.findById(req.user.id)
      .select("-password")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch additional shipping addresses if you use a separate Address model
    const addresses = await Address.find({ userId: req.user.id });

    res.json({ ...user, addresses });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user profile", error: error.message });
  }
};

/* --- UPDATE PROFILE --- */
export const updateProfile = async (req, res) => {
  try {
    // Destructure all possible fields from the body
    const {
      name, email, phone, dob, gender,
      division, district, upazila, union, address
    } = req.body;

    // Build update object dynamically
    const updateData = {
      name,
      email,
      phone,
      dob,
      gender,
      division,
      district,
      upazila,
      union,
      address
    };

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
};

/* --- ADD SHIPPING ADDRESS --- */
export const addAddress = async (req, res) => {
  try {
    const {
      fullName, phone,
      division, district, upazila, union,
      address, isDefault,
    } = req.body;

    if (isDefault) {
      await Address.updateMany(
        { userId: req.user.id },
        { isDefault: false }
      );
    }

    const newAddress = await Address.create({
      userId: req.user.id,
      fullName,
      phone,
      division,
      district,
      upazila,
      union,
      address,
      isDefault: isDefault || false,
    });

    res.status(201).json(newAddress);
  } catch (error) {
    res.status(500).json({ message: "Failed to add address", error: error.message });
  }
};

/* --- GET ADDRESSES --- */
export const getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.user.id }).sort({ isDefault: -1 });
    res.json(addresses);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch addresses", error: error.message });
  }
};

/* --- DELETE ADDRESS --- */
export const deleteAddress = async (req, res) => {
  try {
    const deleted = await Address.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Address not found" });
    }

    res.json({ message: "Address deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete address", error: error.message });
  }
};