import { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native'
import { useFlavorWords } from './FlavorWordsProvider'
import { colors } from '../../lib/colors'
import { useApiClient } from '../../lib/api'

interface SaveWordModalProps {
  visible: boolean
  onClose: () => void
}

export function SaveWordModal({ visible, onClose }: SaveWordModalProps) {
  const { words, addWord } = useFlavorWords()
  const [newWord, setNewWord] = useState('')
  const [saving, setSaving] = useState(false)
  const api = useApiClient()

  const handleSave = useCallback(async () => {
    const word = newWord.trim().toLowerCase()
    if (!word) return
    
    // Check for duplicates
    if (words.includes(word)) {
      Alert.alert('Duplicate Word', 'This word is already in your vocabulary')
      return
    }
    
    setSaving(true)
    
    try {
      await api.post('/flavor-words', { word })
      await addWord(word)
      setNewWord('')
      onClose()
    } catch (error) {
      Alert.alert('Error', 'Failed to save word')
    } finally {
      setSaving(false)
    }
  }, [newWord, words, addWord, onClose, api])

  const handleClose = useCallback(() => {
    setNewWord('')
    onClose()
  }, [onClose])

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Save New Word</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.description}>
            Add a flavor descriptor to your vocabulary
          </Text>
          
          <TextInput
            style={styles.input}
            value={newWord}
            onChangeText={setNewWord}
            placeholder="Enter flavor word..."
            placeholderTextColor={colors.mutedLight}
            autoFocus
            maxLength={100}
          />
          
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                (!newWord.trim() || saving) && styles.disabledButton,
              ]}
              onPress={handleSave}
              disabled={!newWord.trim() || saving}
              activeOpacity={0.7}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: colors.muted,
    fontWeight: '300',
  },
  description: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.foreground,
    marginBottom: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.borderLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: colors.primaryForeground,
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.5,
  },
})