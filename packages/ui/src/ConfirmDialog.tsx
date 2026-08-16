/**
 * ConfirmDialog — confirmation dialog wrapper (spec §17, §19, §11.4).
 *
 * A controlled dialog component built on `@mantine/core`'s `Modal`. Used
 * to confirm sensitive or destructive actions (e.g. revoking a license,
 * deleting a document, closing a legal hold). The dialog's title, body,
 * and button labels are all resolved via `t()` from `react-i18next`.
 *
 * For programmatic confirm-modal flows (without explicitly rendering the
 * component), consumers can use `@mantine/modals`'s `openConfirmModal`
 * directly — this component is the explicit-JSX alternative.
 *
 * RTL-aware: the action buttons use logical `marginInlineStart` so the
 * confirm button appears on the correct side in RTL.
 *
 * Accessibility:
 *  - The dialog sets `role="dialog"` and `aria-modal="true"` (Mantine
 *    handles this automatically).
 *  - Focus is trapped inside the dialog while open.
 *  - Escape closes the dialog (calls `onClose`).
 */

import { type ReactElement, type ReactNode } from 'react';
import { Button, Group, type MantineColor, Modal, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

/** Props for {@link ConfirmDialog}. */
export interface ConfirmDialogProps {
  /** Whether the dialog is open. */
  readonly opened: boolean;
  /** Called when the user requests close (Escape, backdrop click, Cancel). */
  readonly onClose: () => void;
  /** Called when the user clicks the confirm button. */
  readonly onConfirm: () => void;
  /** Translation key for the dialog title. */
  readonly titleKey: string;
  /** Translation key for the dialog body. */
  readonly bodyKey: string;
  /**
   * Translation key for the confirm button label. Default
   * `'common:action.confirm'`.
   */
  readonly confirmLabelKey?: string;
  /**
   * Translation key for the cancel button label. Default
   * `'common:action.cancel'`.
   */
  readonly cancelLabelKey?: string;
  /**
   * Visual tone of the confirm button. `'danger'` renders the confirm
   * button in red — use this for destructive actions (spec §11.4).
   * Default `'primary'`.
   */
  readonly tone?: 'primary' | 'danger';
  /** Optional color override for the confirm button. */
  readonly confirmColor?: MantineColor;
  /** Whether the confirm button is in a loading state. */
  readonly loading?: boolean;
  /** Whether the confirm button is disabled. */
  readonly disabled?: boolean;
  /** Optional extra children rendered below the body text. */
  readonly children?: ReactNode;
  /** Extra CSS class name(s) applied to the root element. */
  readonly className?: string;
}

/**
 * Render a confirmation dialog. The dialog is CONTROLLED — the consumer
 * owns `opened` and `onClose`. The confirm button's tone reflects the
 * severity of the action: pass `tone="danger"` for destructive actions
 * so the button renders in red (spec §11.4 — destructive actions must
 * use a dedicated confirmed UI flow).
 *
 * @example
 *   <ConfirmDialog
 *     opened={opened}
 *     onClose={() => setOpened(false)}
 *     onConfirm={handleDelete}
 *     titleKey="documents:delete.confirmTitle"
 *     bodyKey="documents:delete.confirmBody"
 *     tone="danger"
 *     confirmLabelKey="documents:delete.action"
 *     loading={isDeleting}
 *   />
 */
export function ConfirmDialog({
  opened,
  onClose,
  onConfirm,
  titleKey,
  bodyKey,
  confirmLabelKey = 'common:action.confirm',
  cancelLabelKey = 'common:action.cancel',
  tone = 'primary',
  confirmColor,
  loading = false,
  disabled = false,
  children,
  className,
}: ConfirmDialogProps): ReactElement {
  const { t } = useTranslation();
  const resolvedConfirmColor = confirmColor ?? (tone === 'danger' ? 'red' : 'brand');

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t(titleKey)}
      centered
      className={className}
      // RTL: Mantine handles `dir` automatically via the theme; the action
      // buttons use logical margin so they appear on the correct side.
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t(bodyKey)}
        </Text>
        {children}
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose} disabled={loading}>
            {t(cancelLabelKey)}
          </Button>
          <Button
            variant="filled"
            color={resolvedConfirmColor}
            onClick={onConfirm}
            loading={loading}
            disabled={disabled}
          >
            {t(confirmLabelKey)}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
