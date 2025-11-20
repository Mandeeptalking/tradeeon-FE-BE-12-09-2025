# Add delete endpoint after the pnl endpoint
@router.delete("/dca-bots/{bot_id}")
async def delete_dca_bot(
    bot_id: str = Path(..., description="Bot ID"),
    user: AuthedUser = Depends(get_current_user)
):
    """Delete a DCA bot."""
    try:
        import sys
        import os
        
        # Add bots directory to path
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        from db_service import db_service
        from bot_execution_service import bot_execution_service
        
        # Verify bot belongs to user
        bot_data = db_service.get_bot(bot_id, user_id=user.user_id)
        if not bot_data:
            raise NotFoundError("Bot", f"Bot {bot_id} not found or access denied")
        
        # Stop bot if running
        if bot_execution_service.is_running(bot_id):
            await bot_execution_service.stop_bot(bot_id)
        
        # Delete bot from database
        deleted = db_service.delete_bot(bot_id, user_id=user.user_id)
        
        if not deleted:
        raise TradeeonError(
                "Failed to delete bot",
            "INTERNAL_SERVER_ERROR",
            status_code=500
        )

        logger.info(f"✅ DCA bot {bot_id} deleted successfully")
        
        return {
            "success": True,
            "message": "Bot deleted successfully",
            "bot_id": bot_id
        }
        
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error deleting DCA bot: {e}", exc_info=True)
        raise TradeeonError(
            f"Failed to delete bot: {str(e)}",
            "INTERNAL_SERVER_ERROR",
            status_code=500
        )
