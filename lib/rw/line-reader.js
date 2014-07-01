var reader = require("./reader");

module.exports = function(filePath) {
  var read = reader(filePath), // TODO propagate options
      callbacks,
      buffer = new Buffer(0),
      bufferIndex = 0,
      bufferLength = 0,
      encoding = "utf8", // TODO options
      fragments = null;

  return function readLine(callback) {

    // If we’ve reached the end of the file, return null.
    if (!buffer) return void callback(null, null);

    // If we’re at the end of our buffer, read some bytes, then try again.
    if (bufferIndex >= bufferLength) {
      if (callbacks) return void callbacks.push(callback);
      callbacks = [callback];
      return void read(function(error_, buffer_) {
        error = error_;
        buffer = buffer_;
        bufferIndex = 0;
        bufferLength = buffer && buffer.length;
        var callbacks_ = callbacks;
        callbacks = null;
        callbacks_.forEach(readLine);
      });
    }

    // Otherwise, find the next line terminator.
    var bufferIndex0 = bufferIndex, eol = 0;
    while (bufferIndex < bufferLength) {
      var character = buffer[bufferIndex++];
      if (character === 10) { // \n
        ++eol;
        break;
      }
      if (character === 13) { // \r or \r\n
        ++eol;
        if (buffer[bufferIndex] === 10) ++bufferIndex, ++eol;
        break;
      }
    }

    // Slice the buffer up to the line terminator.
    var fragment = buffer.slice(bufferIndex0, bufferIndex - eol);

    // If we read to the end of a line, return it!
    if (eol) {

      // Combine this with previously-read line fragments, if any.
      if (fragments) {
        fragments.push(fragment);
        fragment = Buffer.concat(fragments);
        fragments = null;
      }

      return void callback(null, fragment.toString(encoding));
    }

    // Otherwise, we’ve read part of a line,
    // or the very last line in a file not terminated with a newline.
    if (fragments) fragments.push(fragment);
    else fragments = [fragment];
    readLine(callback);
  };
};