import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Input
from tensorflow.keras.models import Model
import pandas as pd
import numpy as np
from tensorflow.keras.preprocessing.sequence import pad_sequences

# Load the training and testing data into Pandas DataFrames
train_data = pd.read_csv('C:\\Users\\SBD2RP\\OneDrive - MillerKnoll\\installs\\Desktop\\output\\modified_train_data.csv')
test_data = pd.read_csv('C:\\Users\\SBD2RP\\OneDrive - MillerKnoll\\installs\\Desktop\\output\\modified_test_data.csv')

# Convert data types
train_data['song.sections_start'] = train_data['song.sections_start'].apply(lambda x: np.array(x.split(',')).astype(float) if isinstance(x, str) else np.array([]))
test_data['song.sections_start'] = test_data['song.sections_start'].apply(lambda x: np.array(x.split(',')).astype(float) if isinstance(x, str) else np.array([]))
train_data['input'] = train_data['input'].apply(lambda x: np.array(x.split(',')).astype(float) if isinstance(x, str) else np.array([]))
test_data['input'] = test_data['input'].apply(lambda x: np.array(x.split(',')).astype(float) if isinstance(x, str) else np.array([]))

# Filter out empty arrays
train_data = train_data[train_data['song.sections_start'].apply(len) > 0]
train_data['label'] = train_data['label'].apply(lambda x: np.array(x.split(',')).astype(float))
test_data = test_data[test_data['song.sections_start'].apply(len) > 0]
test_data['label'] = test_data['label'].apply(lambda x: np.array(x.split(',')).astype(float))

# Convert the lists to a list of arrays
X_train_sections = train_data['song.sections_start'].to_list()
X_train_input = train_data['input'].to_list()
y_train = train_data['label'].to_list()

X_test_sections = test_data['song.sections_start'].to_list()
X_test_input = test_data['input'].to_list()
y_test = test_data['label'].to_list()

# Pad sequences to have the same length
X_train_sections = pad_sequences(X_train_sections)
X_train_input = pad_sequences(X_train_input)
X_test_sections = pad_sequences(X_test_sections, maxlen=X_train_sections.shape[1])
X_test_input = pad_sequences(X_test_input, maxlen=X_train_input.shape[1])

# Pad y values to have the same length
max_length = 30
y_train = pad_sequences(y_train, maxlen=max_length)
y_test = pad_sequences(y_test, maxlen=max_length)

# Convert the lists to numpy arrays
X_train_sections = np.array(X_train_sections)
X_train_input = np.array(X_train_input)
X_test_sections = np.array(X_test_sections)
X_test_input = np.array(X_test_input)

# Reshape the input features for the LSTM model
X_train_sections = np.reshape(X_train_sections, (X_train_sections.shape[0], 1, X_train_sections.shape[1]))
X_train_input = np.reshape(X_train_input, (X_train_input.shape[0], 1, X_train_input.shape[1]))
X_test_sections = np.reshape(X_test_sections, (X_test_sections.shape[0], 1, X_test_sections.shape[1]))
X_test_input = np.reshape(X_test_input, (X_test_input.shape[0], 1, X_test_input.shape[1]))

# Define the network architecture
input_sections = Input(shape=(1, X_train_sections.shape[2]))
input_input = Input(shape=(1, X_train_input.shape[2]))

sections_lstm = LSTM(units=128)(input_sections)
input_lstm = LSTM(units=128)(input_input)

concatenated = tf.keras.layers.concatenate([sections_lstm, input_lstm])

output = Dense(units=max_length, activation='sigmoid')(concatenated)

model = Model(inputs=[input_sections, input_input], outputs=output)

# Compile the model
model.compile(loss='binary_crossentropy', optimizer='adam', metrics=['accuracy'])

# Train the model
model.fit([X_train_sections, X_train_input], y_train, batch_size=64, epochs=350, validation_data=([X_test_sections, X_test_input], y_test))

# Evaluate the model
score = model.evaluate([X_test_sections, X_test_input], y_test, verbose=0)
print('Test loss:', score[0])
print('Test accuracy:', score[1])

# Save the trained model
model.save('C:\\Users\\SBD2RP\\OneDrive - MillerKnoll\\installs\\Desktop\\output\\model.h5')

# Make predictions
# predictions = model.predict([X_test_sections, X_test_input])

