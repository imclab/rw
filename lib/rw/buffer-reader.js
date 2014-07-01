var reader = require("./reader");

module.exports = function(filePath) {
  var read = reader(filePath), // TODO propagate options
      callbacks,
      buffer = new Buffer(0),
      bufferIndex = 0,
      bufferLength = 0,
      fragments = null;

  return function readBuffer(bufferLength_, callback) {
    if (!bufferLength_) return void callback(new Error("invalid bufferLength"));

    // If we’ve reached the end of the file, return null.
    if (!buffer) return void callback(null, null);

    // If we’re at the end of our buffer, read some bytes, then try again.
    if (bufferIndex >= bufferLength) {
      var args = [bufferLength_, callback];
      if (callbacks) return void callbacks.push(args);
      callbacks = [args];
      return void read(function(error_, buffer_) {
        error = error_;
        buffer = buffer_;
        bufferIndex = 0;
        bufferLength = buffer && buffer.length;
        var callbacks_ = callbacks;
        callbacks = null;
        callbacks_.forEach(function(args) { readBuffer(args[0], args[1]); });
      });
    }

    // Slice the buffer up to the line terminator.
    var bufferAvailable = bufferLength - bufferIndex,
        fragment = buffer.slice(bufferIndex, bufferIndex += bufferLength_);

    // If we have enough to read the requested bytes, return it.
    if (bufferIndex <= bufferLength) {

      // Combine this with previously-read line fragments, if any.
      if (fragments) {
        fragments.push(fragment);
        fragment = Buffer.concat(fragments);
        fragments = null;
      }

      return void callback(null, fragment);
    }

    // Otherwise, combine this fragment with data from the next chunk.
    if (fragments) fragments.push(fragment);
    else fragments = [fragment];
    readBuffer(bufferLength_ - bufferAvailable, callback);
  };
};