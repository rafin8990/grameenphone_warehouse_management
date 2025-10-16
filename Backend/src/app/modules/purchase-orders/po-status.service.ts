import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import pool from '../../../utils/dbClient';

// Get socket instance dynamically to avoid import issues
const getSocketInstance = () => {
  try {
    const serverModule = require('../../../server');
    return serverModule.io;
  } catch (error) {
    console.log('Socket.IO not available yet');
    return null;
  }
};

// Check and update PO status based on received quantities
const checkAndUpdatePOStatus = async (po_number: string): Promise<{ status: string; isUpdated: boolean }> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log(`🔍 Checking PO status for: ${po_number}`);

    // Get current PO status
    const poQuery = `
      SELECT id, status, po_number
      FROM purchase_orders
      WHERE po_number = $1;
    `;
    const poResult = await client.query(poQuery, [po_number]);

    if (poResult.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, `Purchase order ${po_number} not found`);
    }

    const currentPO = poResult.rows[0];
    const currentStatus = currentPO.status;

    // If already received or cancelled, no need to check
    if (currentStatus === 'received' || currentStatus === 'cancelled') {
      console.log(`⚠️ PO ${po_number} already ${currentStatus}, skipping status check`);
      await client.query('COMMIT');
      return { status: currentStatus, isUpdated: false };
    }

    // Get all items for this PO with their ordered quantities
    const orderedItemsQuery = `
      SELECT 
        pi.item_number,
        pi.quantity as ordered_quantity,
        i.item_description
      FROM po_items pi
      INNER JOIN items i ON pi.item_number = i.item_number
      WHERE pi.po_id = $1;
    `;
    const orderedItemsResult = await client.query(orderedItemsQuery, [currentPO.id]);

    if (orderedItemsResult.rows.length === 0) {
      console.log(`⚠️ No items found for PO ${po_number}`);
      await client.query('COMMIT');
      return { status: currentStatus, isUpdated: false };
    }

    const orderedItems = orderedItemsResult.rows;
    console.log(`📋 Found ${orderedItems.length} items in PO ${po_number}`);

    // Compute received quantities using inbound table - sum quantities for same item number
    const receivedItemsQuery = `
      SELECT 
        (item->>'item_number') as item_number,
        SUM((item->>'quantity')::numeric) as quantity
      FROM inbound,
      LATERAL jsonb_array_elements(items) as item
      WHERE po_number = $1
      GROUP BY (item->>'item_number');
    `;
    const receivedItemsResult = await client.query(receivedItemsQuery, [po_number]);

    const receivedItems: Record<string, number> = {};
    for (const row of receivedItemsResult.rows) {
      receivedItems[row.item_number] = Number(row.quantity);
    }

    console.log(`📦 Aggregated ${Object.keys(receivedItems).length} received items for PO ${po_number} from inbound table`);
    console.log(`📊 Received items breakdown:`, receivedItems);

    // Check each ordered item against received quantities
    let allItemsFullyReceived = true;
    let someItemsReceived = false;
    let totalOrderedQuantity = 0;
    let totalReceivedQuantity = 0;

    for (const orderedItem of orderedItems) {
      const { item_number, ordered_quantity } = orderedItem;
      totalOrderedQuantity += Number(ordered_quantity);

      // Find received quantity for this item
      const receivedQuantity = receivedItems[item_number] ?? 0;
      totalReceivedQuantity += receivedQuantity;

      console.log(`📊 Item ${item_number}: Ordered ${ordered_quantity}, Received ${receivedQuantity}`);

      if (receivedQuantity > 0) {
        someItemsReceived = true;
      }

      if (receivedQuantity < Number(ordered_quantity)) {
        allItemsFullyReceived = false;
        console.log(`⚠️ Item ${item_number} not fully received: ${receivedQuantity}/${ordered_quantity}`);
      }
    }

    console.log(`📈 Total: Ordered ${totalOrderedQuantity}, Received ${totalReceivedQuantity}`);

    // Determine new status
    let newStatus = currentStatus;
    let isUpdated = false;

    if (allItemsFullyReceived && totalReceivedQuantity > 0) {
      newStatus = 'received';
      isUpdated = true;
      console.log(`✅ PO ${po_number} fully received! Status: ${currentStatus} → ${newStatus}`);
    } else if (someItemsReceived && !allItemsFullyReceived) {
      newStatus = 'partial';
      isUpdated = true;
      console.log(`🔄 PO ${po_number} partially received. Status: ${currentStatus} → ${newStatus}`);
    } else if (!someItemsReceived) {
      newStatus = 'pending';
      console.log(`⏳ PO ${po_number} still pending. No items received yet.`);
    }

    // Update PO status if changed
    if (isUpdated) {
      const updateQuery = `
        UPDATE purchase_orders
        SET status = $1, received_at = CASE WHEN $1 = 'received' THEN CURRENT_TIMESTAMP ELSE received_at END
        WHERE po_number = $2
        RETURNING *;
      `;

      const updateResult = await client.query(updateQuery, [newStatus, po_number]);
      const updatedPO = updateResult.rows[0];

      console.log(`✅ PO ${po_number} status updated to: ${newStatus}`);

      // Emit socket event for live updates
      try {
        const io = getSocketInstance();
        if (io) {
          io.emit('po:status-updated', {
            po_number: updatedPO.po_number,
            old_status: currentStatus,
            new_status: newStatus,
            received_at: updatedPO.received_at,
            total_ordered: totalOrderedQuantity,
            total_received: totalReceivedQuantity,
            timestamp: new Date().toISOString()
          });
          console.log(`📡 PO status update event emitted for ${po_number}`);
        }
      } catch (socketError) {
        console.error('Socket emit error (non-critical):', socketError);
      }
    }

    await client.query('COMMIT');
    return { status: newStatus, isUpdated };

  } catch (error: any) {
    await client.query('ROLLBACK');
    
    if (error instanceof ApiError) throw error;
    
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to check and update PO status'
    );
  } finally {
    client.release();
  }
};

// Get PO status summary
const getPOStatusSummary = async (po_number: string) => {
  try {
    const query = `
      SELECT 
        po.po_number,
        po.status,
        po.created_at,
        po.received_at,
        COUNT(pi.id) as total_items,
        SUM(pi.quantity) as total_ordered_quantity,
        COALESCE(inbound_data.total_received_quantity, 0) as total_received_quantity
      FROM purchase_orders po
      LEFT JOIN po_items pi ON po.id = pi.po_id
      LEFT JOIN (
        SELECT 
          po_number,
          SUM((item->>'quantity')::numeric) as total_received_quantity
        FROM inbound,
        LATERAL jsonb_array_elements(items) as item
        WHERE po_number = $1
        GROUP BY po_number
      ) inbound_data ON po.po_number = inbound_data.po_number
      WHERE po.po_number = $1
      GROUP BY po.po_number, po.status, po.created_at, po.received_at, inbound_data.total_received_quantity;
    `;

    const result = await pool.query(query, [po_number]);
    return result.rows[0] || null;
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to get PO status summary');
  }
};

export const POStatusService = {
  checkAndUpdatePOStatus,
  getPOStatusSummary,
};
