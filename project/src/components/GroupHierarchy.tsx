import React, { useState } from 'react';
import { NewGroupForm } from './NewGroupForm';
import { NewMaterialForm } from './NewMaterialForm';

// Mock data structure for demonstration
const initialGroups = [
  {
    id: 'g1',
    name: 'Group 1',
    subgroups: [
      {
        id: 'sg1',
        name: 'Mattress TYPE-1',
        materials: []
      }
    ]
  },
  {
    id: 'g2',
    name: 'Group 2',
    subgroups: [
      {
        id: 'sg2',
        name: 'Mattress TYPE-12',
        materials: []
      }
    ]
  }
];

const GroupHierarchy = () => {
  const [groups, setGroups] = useState(initialGroups);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [expandedSubgroups, setExpandedSubgroups] = useState<string[]>([]);
  const [showNewGroupForm, setShowNewGroupForm] = useState(false);
  const [showNewMaterialForm, setShowNewMaterialForm] = useState<{subgroupId: string}|null>(null);
  const [showNewSubgroupForm, setShowNewSubgroupForm] = useState<{groupId: string}|null>(null);
  const [newSubgroupName, setNewSubgroupName] = useState('');

  // Toggle expand/collapse for groups
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(expanded =>
      expanded.includes(groupId)
        ? expanded.filter(id => id !== groupId)
        : [...expanded, groupId]
    );
  };

  // Toggle expand/collapse for subgroups
  const toggleSubgroup = (subgroupId: string) => {
    setExpandedSubgroups(expanded =>
      expanded.includes(subgroupId)
        ? expanded.filter(id => id !== subgroupId)
        : [...expanded, subgroupId]
    );
  };

  // Add a new main group
  const handleAddGroup = (name: string) => {
    setGroups([
      ...groups,
      { id: `g${groups.length + 1}`, name, subgroups: [] }
    ]);
  };

  // Add a new subgroup
  const handleAddSubgroup = (groupId: string, name: string) => {
    setGroups(groups.map(group =>
      group.id === groupId
        ? {
            ...group,
            subgroups: [
              ...group.subgroups,
              { id: `sg${group.subgroups.length + 1}`, name, materials: [] }
            ]
          }
        : group
    ));
  };

  // Add a new material (mock, just adds a placeholder)
  const handleAddMaterial = (subgroupId: string, material: any) => {
    setGroups(groups.map(group => ({
      ...group,
      subgroups: group.subgroups.map(sub =>
        sub.id === subgroupId
          ? { ...sub, materials: [...sub.materials, material] }
          : sub
      )
    })));
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Inventory Management</h2>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => setShowNewGroupForm(true)}
        >
          + Add Main Group
        </button>
      </div>
      <div>
        {groups.map(group => (
          <div key={group.id} className="border-b py-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{group.name}</div>
              <div>
                <button
                  className="mr-2 text-green-600"
                  onClick={() => setShowNewSubgroupForm({ groupId: group.id })}
                  title="Add Subgroup"
                >
                  +
                </button>
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="text-gray-600 border rounded-full w-7 h-7 flex items-center justify-center"
                  title={expandedGroups.includes(group.id) ? 'Collapse' : 'Expand'}
                >
                  {expandedGroups.includes(group.id) ? '▲' : '▼'}
                </button>
              </div>
            </div>
            {expandedGroups.includes(group.id) && (
              <div className="ml-6 mt-2">
                {group.subgroups.map(sub => (
                  <div key={sub.id} className="mb-2">
                    <div className="flex items-center justify-between">
                      <div>{sub.name}</div>
                      <div>
                        <button
                          className="mr-2 text-blue-600"
                          onClick={() => setShowNewMaterialForm({ subgroupId: sub.id })}
                          title="Add Material"
                        >
                          +
                        </button>
                        <button
                          onClick={() => toggleSubgroup(sub.id)}
                          className="text-gray-600 border rounded-full w-7 h-7 flex items-center justify-center"
                          title={expandedSubgroups.includes(sub.id) ? 'Collapse' : 'Expand'}
                        >
                          {expandedSubgroups.includes(sub.id) ? '▲' : '▼'}
                        </button>
                      </div>
                    </div>
                    {expandedSubgroups.includes(sub.id) && (
                      <div className="ml-6 mt-1">
                        {sub.materials.length === 0 && <div className="text-gray-400 text-sm">No materials yet.</div>}
                        {sub.materials.map((mat: any, idx: number) => (
                          <div key={idx} className="py-1 text-sm">{mat.name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {showNewGroupForm && (
        <NewGroupForm
          onClose={() => setShowNewGroupForm(false)}
          onSuccess={() => {
            setShowNewGroupForm(false);
            // For demo, just add a group with a placeholder name
            handleAddGroup('New Group');
          }}
        />
      )}
      {showNewSubgroupForm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-2">Add Subgroup</h3>
            <input
              type="text"
              className="w-full border px-3 py-2 rounded mb-4"
              placeholder="Subgroup name"
              value={newSubgroupName}
              onChange={e => setNewSubgroupName(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-100 rounded"
                onClick={() => { setShowNewSubgroupForm(null); setNewSubgroupName(''); }}
              >Cancel</button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={() => {
                  if (newSubgroupName.trim()) {
                    handleAddSubgroup(showNewSubgroupForm.groupId, newSubgroupName);
                    setShowNewSubgroupForm(null);
                    setNewSubgroupName('');
                  }
                }}
              >Add</button>
            </div>
          </div>
        </div>
      )}
      {showNewMaterialForm && (
        <NewMaterialForm
          inventory={[]}
          onAddMaterial={mat => {
            handleAddMaterial(showNewMaterialForm.subgroupId, mat);
            setShowNewMaterialForm(null);
          }}
          onClose={() => setShowNewMaterialForm(null)}
        />
      )}
    </div>
  );
};

export default GroupHierarchy; 