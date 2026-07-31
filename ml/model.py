import torch
import torch.nn as nn

class LogAnomalyLSTM(nn.Module):
  def __init__(self, num_classes, input_size, hidden_size, num_layers):
    super().__init__()

    self.hidden_size = hidden_size
    self.num_layers = num_layers

    # Embedding layer
    self.embedding = nn.Embedding(
      num_embeddings=num_classes,
      embedding_dim=input_size,
    )

    # LSTM with dropout (dropout only works if num_layers > 1)
    self.lstm = nn.LSTM(
      input_size=input_size,
      hidden_size=hidden_size,
      num_layers=num_layers,
      batch_first=True,
      dropout=0.2,
    )

    # Dropout before classification
    self.dropout = nn.Dropout(0.1)

    # Classification layer
    self.fc = nn.Linear(hidden_size, num_classes)

    self._init_weights()


  def _init_weights(self):

    nn.init.xavier_uniform_(self.embedding.weight)

    nn.init.xavier_uniform_(self.fc.weight)

    nn.init.zeros_(self.fc.bias)

  def forward(self, x):
    # (batch_size, window_size)
    x = self.embedding(x)

    # (batch_size, window_size, hidden_size)
    out, _ = self.lstm(x)

    # Last timestep
    out = out[:, -1, :]

    # Regularization
    out = self.dropout(out)

    # Predict next template
    out = self.fc(out)

    return out