import { ChainId } from '@sushiswap/chain'
import { classNames, NotificationData } from '@sushiswap/ui'
import React, { FC, ReactNode } from 'react'

import { ApprovalState } from '../../hooks'
import { Bentobox } from './Bentobox'
import { Token } from './Token'
import { ApprovalType, ApprovalTypeBentobox, ApprovalTypeToken, ToDef } from './types'

export interface RootProps {
  chainId: ChainId | undefined
  className?: string
  children: ReactNode
  definition: Array<ToDef<ApprovalTypeBentobox> | ToDef<ApprovalTypeToken>>
  onSuccess(data: NotificationData): void
}

const APPROVE_BUTTON_MAP = {
  [ApprovalType.Bentobox]: Bentobox,
  [ApprovalType.Token]: Token,
}

export const Root: FC<RootProps> = ({ className, children, definition, onSuccess, chainId }) => {
  const components = definition.map((element, index) => {
    switch (element.type) {
      case ApprovalType.Bentobox: {
        const { masterContract, type, enabled, buttonProps, onSignature } = element
        return APPROVE_BUTTON_MAP[type]({
          masterContract,
          type,
          enabled,
          buttonProps,
          chainId,
          onSuccess,
          index,
          onSignature,
        })
      }

      default:
      case ApprovalType.Token: {
        const { address, amount, type, enabled, buttonProps } = element
        return APPROVE_BUTTON_MAP[type]({ address, amount, type, enabled, buttonProps, chainId, onSuccess, index })
      }
    }
  })

  const icons = components.map((component) => component.iconButton)

  const indexOfNextApproval = components.findIndex((component) => {
    return [ApprovalState.LOADING, ApprovalState.PENDING, ApprovalState.NOT_APPROVED].includes(component.approvalState)
  }, [])

  return (
    <div className={classNames(className, 'flex flex-col justify-center items-center w-full')}>
      <div className="flex">{icons}</div>
      {indexOfNextApproval === -1 ? children : components[indexOfNextApproval].button}
    </div>
  )
}